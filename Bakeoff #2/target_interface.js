// Bakeoff #2 - Seleção de Alvos e Fatores Humanos
// IPM 2020-21, Semestre 2
// Entrega: até dia 7 de Maio às 23h59 através do Fenix
// Bake-off: durante os laboratórios da semana de 3 de Maio

// p5.js reference: https://p5js.org/reference/

// Database (CHANGE THESE!)
const GROUP_NUMBER = 36;      // Add your group number here as an integer (e.g., 2, 3)
const BAKE_OFF_DAY = false;  // Set to 'true' before sharing during the simulation and bake-off days

// Target and grid properties (DO NOT CHANGE!)
let PPI, PPCM;
let TARGET_SIZE;
let TARGET_PADDING, MARGIN, LEFT_PADDING, TOP_PADDING;
let continue_button;

// Metrics
let testStartTime, testEndTime;// time between the start and end of one attempt (48 trials)
let hits = 0;      // number of successful selections
let misses = 0;      // number of missed selections (used to calculate accuracy)
let database;                  // Firebase DB  

// Study control parameters
let draw_targets = false;  // used to control what to show in draw()
let trials = [];     // contains the order of targets that activate in the test
let current_trial = 0;      // the current trial number (indexes into trials array above)
let attempt = 0;      // users complete each test twice to account for practice (attemps 0 and 1)
let fitts_IDs = ["---"];     // add the Fitts ID for each selection here (-1 when there is a miss)

// Target class (position and width)
class Target {
    constructor(x, y, w) {
        this.x = x;
        this.y = y;
        this.w = w;
    }
}

// Runs once at the start
function setup() {
    createCanvas(700, 500);    // window size in px before we go into fullScreen()
    frameRate(60);             // frame rate (DO NOT CHANGE!)

    randomizeTrials();         // randomize the trial order at the start of execution

    textFont("Arial", 18);     // font size for the majority of the text
    drawUserIDScreen();        // draws the user input screen (student number and display size)
    right = loadSound("right.mp3");
    wrong = loadSound("wrong.mp3");
}

var startAt;
// Runs every frame and redraws the screen
function draw() {
    if (draw_targets) {
        background(color(0, 0, 0));
        fill(color(255, 255, 255));
        textAlign(LEFT);

        text("Trial " + (current_trial + 1) + " of " + trials.length, 50, 20);

        strokeWeight(8)
        stroke(color(229, 42, 42));
        line(0, 0, ((current_trial + 1) / trials.length) * width, 0);

        // Draw Arrows
        strokeWeight(8)
        strokeWeight(4)

        if (current_trial < trials.length) {
            let current_line_color = color(229, 42, 42);
            let next_line_color = color(99, 9, 9);
            let current_target = getTargetBounds(trials[current_trial]);
            let next_target = getTargetBounds(trials[current_trial + 1]);
            drawArrow(current_target, next_target, next_line_color);
            if (current_trial > 0) {
                let previous_target = getTargetBounds(trials[current_trial - 1]);
                drawArrow(previous_target, current_target, current_line_color);
            }
        }

        noStroke();
        // Draw all 16 targets
        for (var i = 0; i < 16; i++) drawTarget(i);
    }
}

// Function for drawing an arraw
function drawArrow(t1, t2, line_color) {
    var radius = t1.w;
    var triangle_vec;
    stroke(line_color)

    // Draw Line
    if ((t2.x - t1.x) != 0) {
        // Line Params for intersect calculations
        let m = (t2.y - t1.y) / (t2.x - t1.x);
        let n = - ((m * t2.x) - t2.y);
        if (t1.x < t2.x) {
            let x1 = Math.max(...findCircleLineIntersections(radius, t1.x, t1.y, m, n));
            let x2 = Math.min(...findCircleLineIntersections(radius, t2.x, t2.y, m, n));
            line(x1, x1 * m + n, x2, x2 * m + n);
            triangle_vec = createVector(x2, x2 * m + n);
        } else {
            let x1 = Math.min(...findCircleLineIntersections(radius, t1.x, t1.y, m, n));
            let x2 = Math.max(...findCircleLineIntersections(radius, t2.x, t2.y, m, n));
            line(x1, x1 * m + n, x2, x2 * m + n);
            triangle_vec = createVector(x2, x2 * m + n);
        }
    }

    else { // Same Column
        if (t1.y == t2.y) { // Double Click case, no arrow needed
            return
        }
        else if (t1.y < t2.y) { // Bottom to Top
            line(t1.x, t1.y + radius, t2.x, t2.y - radius);
            triangle_vec = createVector(t2.x, t2.y - radius);
        }
        else { // Top to Bottom
            radius = -radius;
            line(t1.x, t1.y + radius, t2.x, t2.y - radius);
            triangle_vec = createVector(t2.x, t2.y - radius);
        }
    }

    // Draw Triangle
    let arrowSize = t1.w / 4;
    var angle = atan2(t1.y - t2.y, t1.x - t2.x); //gets the angle of the line
    push() //start new drawing state
    noStroke();
    fill(line_color);
    translate(triangle_vec.x, triangle_vec.y); //translates to the destination vertex
    rotate(angle - HALF_PI); //rotates the arrow point
    triangle(-arrowSize * 0.5, arrowSize, arrowSize * 0.5, arrowSize, 0, -arrowSize / 2); //draws the arrow point as a triangle
    pop();

}

// Find Circle Line Intersections
function findCircleLineIntersections(r, h, k, m, n) {
    // circle: (x - h)^2 + (y - k)^2 = r^2
    // line: y = m * x + n
    // r: circle radius
    // h: x value of circle centre
    // k: y value of circle centre
    // m: slope
    // n: y-intercept

    // get a, b, c values
    var a = 1 + sq(m);
    var b = -h * 2 + (m * (n - k)) * 2;
    var c = sq(h) + sq(n - k) - sq(r);

    // get discriminant
    var d = sq(b) - 4 * a * c;
    if (d >= 0) {
        // insert into quadratic formula
        var intersections = [
            (-b + sqrt(sq(b) - 4 * a * c)) / (2 * a),
            (-b - sqrt(sq(b) - 4 * a * c)) / (2 * a)
        ];
        if (d == 0) {
            // only 1 intersection
            return [intersections[0]];
        }
        return intersections;
    }
    // no intersection
    return [];
}

// Print and save results at the end of 48 trials
function printAndSavePerformance() {
    // DO NOT CHANGE THESE! 
    let accuracy = parseFloat(hits * 100) / parseFloat(hits + misses);
    let test_time = (testEndTime - testStartTime) / 1000;
    let time_per_target = nf((test_time) / parseFloat(hits + misses), 0, 3);
    let penalty = constrain((((parseFloat(95) - (parseFloat(hits * 100) / parseFloat(hits + misses))) * 0.2)), 0, 100);
    let target_w_penalty = nf(((test_time) / parseFloat(hits + misses) + penalty), 0, 3);
    let timestamp = day() + "/" + month() + "/" + year() + "  " + hour() + ":" + minute() + ":" + second();

    background(color(0, 0, 0));   // clears screen
    fill(color(255, 255, 255));   // set text fill color to white
    text(timestamp, 10, 20);    // display time on screen (top-left corner)

    textAlign(CENTER);
    text("Attempt " + (attempt + 1) + " out of 2 completed!", width / 2, 60);
    text("Hits: " + hits, width / 2, 100);
    text("Misses: " + misses, width / 2, 120);
    text("Accuracy: " + accuracy + "%", width / 2, 140);
    text("Total time taken: " + test_time + "s", width / 2, 160);
    text("Average time per target: " + time_per_target + "s", width / 2, 180);
    text("Average time for each target (+ penalty): " + target_w_penalty + "s", width / 2, 220);

    // Changed
    text("Fitts index of Performance:", width / 2, 240);

    height = 260;
    column1_y = width / 3
    column2_y = column1_y * 2
    count = 1;
    target = 1;
    mid = Math.floor(fitts_IDs.length / 2)
    column = column1_y;

    fitts_IDs.map((id) => {
        string = `Target ${target}: ${id}`;
        if ((count - 1) === mid) {
            column = column2_y;
            count = 1;
        }
        text(string, column, height + count * 20);
        count++;
        target++;
    })

    // Saves results (DO NOT CHANGE!)
    let attempt_data =
    {
        project_from: GROUP_NUMBER,
        assessed_by: student_ID,
        test_completed_by: timestamp,
        attempt: attempt,
        hits: hits,
        misses: misses,
        accuracy: accuracy,
        attempt_duration: test_time,
        time_per_target: time_per_target,
        target_w_penalty: target_w_penalty,
        fitts_IDs: fitts_IDs
    }

    // Send data to DB (DO NOT CHANGE!)
    if (BAKE_OFF_DAY) {
        // Access the Firebase DB
        if (attempt === 0) {
            firebase.initializeApp(firebaseConfig);
            database = firebase.database();
        }

        // Add user performance results
        let db_ref = database.ref('G' + GROUP_NUMBER);
        db_ref.push(attempt_data);
    }
}

// Mouse button was pressed - lets test to see if hit was in the correct target
function mousePressed() {
    // Only look for mouse releases during the actual test
    // (i.e., during target selections)

    if (draw_targets) {
        // Get the location and size of the target the user should be trying to select
        let target = getTargetBounds(trials[current_trial]);
        let next_target = getTargetBounds(trials[current_trial + 1]);

        // Check to see if the mouse cursor is inside the target bounds,
        // increasing either the 'hits' or 'misses' counters
        if (dist(target.x, target.y, mouseX, mouseY) < target.w / 2) {
            // Changed
            if (current_trial < trials.length - 1) {
                fitts_IDs.push(Math.round(Math.log2((dist(next_target.x, next_target.y, mouseX, mouseY) / next_target.w + 1)) * 1000) / 1000);
            }
            hits++; right.play();
        }
        else {
            // Changed
            if (current_trial < trials.length - 1) {
                fitts_IDs.push("MISSED");
            }
            misses++;
            wrong.play();
        }

        current_trial++;                 // Move on to the next trial/target

        // Check if the user has completed all 48 trials
        if (current_trial === trials.length) {
            testEndTime = millis();
            draw_targets = false;          // Stop showing targets and the user performance results
            printAndSavePerformance();     // Print the user's results on-screen and send these to the DB
            attempt++;

            // If there's an attempt to go create a button to start this
            if (attempt < 2) {
                continue_button = createButton('START 2ND ATTEMPT');
                continue_button.mouseReleased(continueTest);
                continue_button.position(width / 2 - continue_button.size().width / 2, height / 2 - continue_button.size().height / 2 + 200);
            }
        }
    }
}

// Draw target on-screen
function drawTarget(i) {

    // Get the location and size for target (i)
    let target = getTargetBounds(i);

    // Draws the target
    fill(color(155, 155, 155));

    // Check whether this target is the target the user should be trying to select
    if (trials[current_trial] === i) {
        if (!mouseIsPressed)
            fill(color(229, 42, 42));
    }

    else if (trials[current_trial + 1] === i) {
        fill(color(99, 9, 9));
    }

    // Does not draw a border if this is not the target the user
    // should be trying to select
    else noStroke();

    if (dist(target.x, target.y, mouseX, mouseY) < target.w / 2) {
        if (trials[current_trial] === i) {
            stroke(color(255));
            strokeWeight(0.05 * target.w);
            if (mouseIsPressed) {
                strokeWeight(0.1 * target.w);
            }
        }

    }

    circle(target.x, target.y, target.w);
    noStroke();

    if (trials[current_trial] === i && i === trials[current_trial + 1]) {
        fill(color(255, 255, 255));
        textAlign(CENTER)
        textSize(target.w / 4)
        text("x2", target.x, target.y + target.w / 16);
        textSize(18);
    }
}

// Returns the location and size of a given target
function getTargetBounds(i) {
    var x = parseInt(LEFT_PADDING) + parseInt((i % 4) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);
    var y = parseInt(TOP_PADDING) + parseInt(Math.floor(i / 4) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);

    return new Target(x, y, TARGET_SIZE);
}

// Evoked after the user starts its second (and last) attempt
function continueTest() {
    // Re-randomize the trial order
    shuffle(trials, true);
    current_trial = 0;
    print("trial order: " + trials);

    // Resets performance variables
    hits = 0;
    misses = 0;
    fitts_IDs = ["---"];

    continue_button.remove();

    // Shows the targets again
    draw_targets = true;
    testStartTime = millis();
}

// Is invoked when the canvas is resized (e.g., when we go fullscreen)
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);

    let display = new Display({ diagonal: display_size }, window.screen);

    // DO NOT CHANGE THESE!
    PPI = display.ppi;                        // calculates pixels per inch
    PPCM = PPI / 2.54;                         // calculates pixels per cm
    TARGET_SIZE = 1.5 * PPCM;                         // sets the target size in cm, i.e, 1.5cm
    TARGET_PADDING = 1.5 * PPCM;                         // sets the padding around the targets in cm
    MARGIN = 1.5 * PPCM;                         // sets the margin around the targets in cm

    // Sets the margin of the grid of targets to the left of the canvas (DO NOT CHANGE!)
    LEFT_PADDING = width / 2 - TARGET_SIZE - 1.5 * TARGET_PADDING - 1.5 * MARGIN;

    // Sets the margin of the grid of targets to the top of the canvas (DO NOT CHANGE!)
    TOP_PADDING = height / 2 - TARGET_SIZE - 1.5 * TARGET_PADDING - 1.5 * MARGIN;

    // Starts drawing targets immediately after we go fullscreen
    draw_targets = true;
}

