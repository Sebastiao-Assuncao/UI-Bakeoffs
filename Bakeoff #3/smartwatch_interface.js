// Bakeoff #3 - Escrita em Smartwatches
// IPM 2020-21, Semestre 2
// Entrega: até dia 4 de Junho às 23h59 através do Fenix
// Bake-off: durante os laboratórios da semana de 31 de Maio

// p5.js reference: https://p5js.org/reference/

// Database (CHANGE THESE!)
const GROUP_NUMBER = 36;      // add your group number here as an integer (e.g., 2, 3)
const BAKE_OFF_DAY = true;  // set to 'true' before sharing during the simulation and bake-off days

let PPI, PPCM;                 // pixel density (DO NOT CHANGE!)
let second_attempt_button;     // button that starts the second attempt (DO NOT CHANGE!)

// Finger parameters (DO NOT CHANGE!)
let finger_img;                // holds our finger image that simules the 'fat finger' problem
let FINGER_SIZE, FINGER_OFFSET;// finger size and cursor offsett (calculated after entering fullscreen)

// Arm parameters (DO NOT CHANGE!)
let arm_img;                   // holds our arm/watch image
let ARM_LENGTH, ARM_HEIGHT;    // arm size and position (calculated after entering fullscreen)

// Study control parameters (DO NOT CHANGE!)
let draw_finger_arm = false;  // used to control what to show in draw()
let phrases = [];     // contains all 501 phrases that can be asked of the user
let current_trial = 0;      // the current trial out of 2 phrases (indexes into phrases array above)
let attempt = 0       // the current attempt out of 2 (to account for practice)
let target_phrase = "";     // the current target phrase
let currently_typed = "";     // what the user has typed so far
let entered = new Array(2); // array to store the result of the two trials (i.e., the two phrases entered in one attempt)
let CPS = 0;      // add the characters per second (CPS) here (once for every attempt)

// Metrics
let attempt_start_time, attempt_end_time; // attemps start and end times (includes both trials)
let trial_end_time;            // the timestamp of when the lastest trial was completed
let letters_entered = 0;      // running number of letters entered (for final WPM computation)
let letters_expected = 0;      // running number of letters expected (from target phrase)
let errors = 0;      // a running total of the number of errors (when hitting 'ACCEPT')
let database;                  // Firebase DB

// Sounds
let tap;
// Red dot
let dot_offset_x = -0.42;
let dot_offset_y = -0.28;
let dot_radius = 0.1;
// Current Letter Display
let current_letter = "";      // current char being displayed on our basic 2D keyboard (starts with 'a')
// 2D Keyboard UI
let key_rel_size = 0.35
let key_aspect_ratio = 1 / 1.935
let key_horizontal_spacing = 1.0
let key_vertical_spacing = 1.0
let qwerty_keyboard = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["_", "z", "x", "c", "v", "b", "n", "m", "<-"]
]
let keyboard_bounds = [];
let keyboard_rows_x0 = [];

// Word Completion Menu
let cont_1w;
let suggested_words = [];
let suggested_words_rel_y_size = 0.5;
let suggested_words_rel_x_size = 3.98 / 2;
let suggested_words_bounds;

// Runs once before the setup() and loads our data (images, phrases)
function preload() {
    // Loading Sounds
    tap = loadSound("data/tap.mp3");
    // Loads simulation images (arm, finger) -- DO NOT CHANGE!
    arm = loadImage("data/arm_watch.png");
    fingerOcclusion = loadImage("data/finger.png");
    // Loads the target phrases (DO NOT CHANGE!)
    phrases = loadStrings("data/phrases.txt");
    // Loads txt files for word completion
    count_1w = loadStrings("data/count_1w.txt");
}

// Runs once at the start
function setup() {
    createCanvas(700, 500);   // window size in px before we go into fullScreen()
    frameRate(60);            // frame rate (DO NOT CHANGE!)
    // DO NOT CHANGE THESE!
    shuffle(phrases, true);   // randomize the order of the phrases list (N=501)
    target_phrase = phrases[current_trial];
    drawUserIDScreen();       // draws the user input screen (student number and display size)
}

function draw() {
    if (draw_finger_arm) {
        background(255);           // clear background
        noStroke();

        drawArmAndWatch();         // draws arm and watch background
        writeTargetAndEntered();   // writes the target and entered phrases above the watch
        drawACCEPT();              // draws the 'ACCEPT' button that submits a phrase and completes a trial

        // Draws the non-interactive screen area (4x1cm) -- DO NOT CHANGE SIZE!
        // noStroke();
        // noFill();
        // // fill(155, 155, 155);
        // rect(width / 2 - 2.0 * PPCM, height / 2 - 2.0 * PPCM, 4.0 * PPCM, 1.0 * PPCM);
        // textAlign(CENTER);
        // textFont("Arial", 16);
        // fill(0);
        // text("NOT INTERACTIVE", width / 2, height / 2 - 1.3 * PPCM);
        drawHoveredSelection();

        // Draws the touch input area (4x3cm) -- DO NOT CHANGE SIZE!
        // stroke(0, 255, 0);
        // rect(width / 2 - 2.0 * PPCM, height / 2 - 1.0 * PPCM, 4.0 * PPCM, 3.0 * PPCM);
        draw2Dkeyboard();       // draws our basic 2D keyboard UI

        noCursor();             // hides the cursor to simulate the 'fat finger'
        drawFatFinger();        // draws the finger that simulates the 'fat finger' problem
        drawDot();
    }
}

// Draws 2D keyboard UI (current letter and left and right arrows)
function draw2Dkeyboard() {
    [keyboard_bounds, keyboard_rows_x0] = drawQWERTYKeyboard(width / 2 - 2.0 * PPCM, height / 2 + 0.01 * PPCM, qwerty_keyboard);
    suggested_words_bounds = drawSuggestedWords(width / 2 - 1.95 * PPCM, height / 2 - 1 * PPCM);
}

// Draws Qwerty Keyboard
function drawQWERTYKeyboard(x0, y0) {
    let x0_rows = []
    let x_size = key_rel_size * PPCM;
    let y_size = x_size / key_aspect_ratio;
    textFont("Arial", x_size / 2);
    for (i = 0; i < qwerty_keyboard.length; i++) {
        // Find y offset for this row
        let y_offset = (key_vertical_spacing * key_rel_size / key_aspect_ratio * i);
        let y0_row = y0 + y_offset * PPCM;
        // Center the Row on the Screen
        let x0_row = x0 + (4.075 * PPCM - qwerty_keyboard[i].length * x_size * key_horizontal_spacing) / 2;
        x0_rows.push(x0_row);
        for (j = 0; j < qwerty_keyboard[i].length; j++) {
            // Finds x offset for key
            let x_offset = key_horizontal_spacing * key_rel_size * j;
            let x_pos = x0_row + x_offset * PPCM;
            // Draw Key
            fill(color(255, 255, 255));
            stroke(color(0, 0, 0));
            strokeWeight(x_size * 0.002);
            rect(x_pos, y0_row, x_size, y_size);
            noStroke();
            // Draw Letter on key
            textAlign(CENTER);
            fill(color(0, 0, 0));
            text(qwerty_keyboard[i][j], x_pos + x_size / 2, y0_row + y_size / 2);
        }
    }
    let bounds = [x0, y0, x0 + x_size * Math.max.apply(Math, qwerty_keyboard.map((el) => { return el.length })), y0 * y_size * qwerty_keyboard.length];
    return [bounds, x0_rows];
}

// Gets which key was pressed on the keyboard
function getKeyboardPressedKey() {
    let x_size = key_rel_size * PPCM;
    let y_size = x_size / key_aspect_ratio;
    if (keyboard_bounds[1] < mouseY + dot_offset_y * PPCM && mouseY + dot_offset_y * PPCM < keyboard_bounds[1] + (y_size * key_vertical_spacing) * qwerty_keyboard.length - (y_size * (1 - key_vertical_spacing))) {
        let row = Math.floor((mouseY + dot_offset_y * PPCM - keyboard_bounds[1]) / y_size);
        let x0 = keyboard_rows_x0[row];
        if (x0 < mouseX + dot_offset_x * PPCM && mouseX + dot_offset_x * PPCM < x0 + (x_size * key_horizontal_spacing) * qwerty_keyboard[row].length - (x_size * (1 - key_horizontal_spacing))) {
            let col = Math.floor((mouseX + dot_offset_x * PPCM - x0) / x_size);
            return [row, col];
        }
        return [row, -1]
    }
    return [-1, -1]
}

function drawDot() {
    if (mouseClickWithin(width / 2 - 2.0 * PPCM, height / 2 - 1.0 * PPCM, 4.0 * PPCM, 3.0 * PPCM) && mouseIsPressed) {
        fill(color(255, 0, 0));
        circle(mouseX + dot_offset_x * PPCM, mouseY + dot_offset_y * PPCM, dot_radius * PPCM);
    }
}

// Draws Word Suggestions
function drawSuggestedWords(x0, y0) {
    // Makes a 2x2 grid of words spanning the whole width of the screen
    let x_size = suggested_words_rel_x_size * PPCM;
    let y_size = suggested_words_rel_y_size * PPCM;
    for (i = 0; i < suggested_words.length; i++) {
        for (j = 0; j < suggested_words[i].length; j++) {
            if (suggested_words[i][j]) {
                // Suggested words may have empty strings in the end,
                // so we start drawing closer closer to the keyboard
                let x_pos = x0 + x_size * j;
                let y_pos = (y0 + y_size) - y_size * i;
                stroke(color(0, 0, 0));
                strokeWeight(x_size * 0.002);
                fill(color(255, 255, 255));
                rect(x_pos, y_pos, x_size, y_size);
                textAlign(CENTER);
                fill(color(0, 0, 0));
                noStroke();
                text(suggested_words[i][j], x_pos + x_size / 2, y_pos + y_size / 2);
            }
        }
    }
    if (suggested_words.length > 0) {
        return [x0, y0, x0 + x_size * suggested_words.length, y0 + y_size * suggested_words[0].length];
    }
}

// Returns the pressed word from the suggestions menu
function getPressedWord() {
    let x_size = suggested_words_rel_x_size * PPCM;
    let y_size = suggested_words_rel_y_size * PPCM;
    let n = (suggested_words.length - 1) - Math.floor((mouseY + dot_offset_y * PPCM - suggested_words_bounds[1]) / y_size);
    let m = Math.floor((mouseX + dot_offset_x * PPCM - suggested_words_bounds[0]) / x_size);
    if (suggested_words != undefined && suggested_words[n] != undefined && suggested_words[n][m] != undefined) {
        return suggested_words[n][m]; // Because it grows from the bottom
    }
    return -1
}

// Updates word suggestions
function updateSuggestedWords() {
    top_matches = [];
    if (currently_typed.length > 0 && currently_typed[currently_typed.length - 1] != " ") {
        // Get the word we want to match
        let splitted = currently_typed.split(" ");
        let last_word = splitted[splitted.length - 1];
        if (last_word.length <= 7) { // For a smoother performance
            // Find the four best matches in the txt
            for (i = 0; i < count_1w.length && top_matches.length < 4; i++) {
                let word = count_1w[i].split("\t")[0];
                if (word.match("^" + last_word)) { // Match from beginning
                    top_matches.push(word);
                }
            }
            suggested_words = [[top_matches[0], top_matches[1]], [top_matches[2], top_matches[3]]];
        } else { suggested_words = [] }
    } else {
        suggested_words = [];
    }
}

// Draws current hovered selection
function drawHoveredSelection() {
    textFont("Arial", PPCM * 0.33);
    // Check if mouse click happened within the touch input area
    if (mouseClickWithin(width / 2 - 2.0 * PPCM, height / 2 - 1.0 * PPCM, 4.0 * PPCM, 3.0 * PPCM) && mouseClickWithin2(width / 2 - 2.0 * PPCM, height / 2 - 1.0 * PPCM, 4.0 * PPCM, 3.0 * PPCM, mouseX + dot_offset_x * PPCM, mouseY + dot_offset_y * PPCM) && mouseIsPressed) {
        // Check if mouse click happened within the keyboard area
        if (mouseClickWithin2(...keyboard_bounds, mouseX + dot_offset_x * PPCM, mouseY + dot_offset_y * PPCM)) {
            let [row, col] = getKeyboardPressedKey();
            if (row != -1 && col != -1) {
                current_letter = qwerty_keyboard[row][col];
            }
        }
        // Check if mouse click happened within the suggested words area
        else if (suggested_words.length > 0 && mouseClickWithin2(...suggested_words_bounds, mouseX + dot_offset_x * PPCM, mouseY + dot_offset_y * PPCM)) {
            let pressed_word = getPressedWord();
            if (pressed_word != -1) {
                current_letter = pressed_word;
            }
        }
    } else {
        current_letter = ""
    }
    text(current_letter, width / 2, height / 2 - 1.3 * PPCM);
}

// Evoked when the mouse button was pressed
function mousePressed() {
    // Only look for mouse presses during the actual test
    if (draw_finger_arm) {
        // Check if mouse click happened within 'ACCEPT' 
        // (i.e., submits a phrase and completes a trial)
        if (mouseClickWithin(width / 2 - 2 * PPCM, height / 2 - 5.1 * PPCM, 4.0 * PPCM, 2.0 * PPCM)) {
            // Saves metrics for the current trial
            letters_expected += target_phrase.trim().length;
            letters_entered += currently_typed.trim().length;
            errors += computeLevenshteinDistance(currently_typed.trim(), target_phrase.trim());
            entered[current_trial] = currently_typed;
            trial_end_time = millis();
            current_trial++;
            // Check if the user has one more trial/phrase to go
            if (current_trial < 2) {
                // Prepares for new trial
                currently_typed = "";
                target_phrase = phrases[current_trial];
            }
            else {
                // The user has completed both phrases for one attempt
                draw_finger_arm = false;
                attempt_end_time = millis();
                printAndSavePerformance();        // prints the user's results on-screen and sends these to the DB
                attempt++;
                // Check if the user is about to start their second attempt
                if (attempt < 2) {
                    second_attempt_button = createButton('START 2ND ATTEMPT');
                    second_attempt_button.mouseReleased(startSecondAttempt);
                    second_attempt_button.position(width / 2 - second_attempt_button.size().width / 2, height / 2 + 200);
                }
            }
        }
    }
}

// Evoked when the mouse button was released
function mouseReleased() {
    // Only look for mouse presses during the actual test
    if (draw_finger_arm) {
        // Check if mouse click happened within the touch input area
        if (mouseClickWithin(width / 2 - 2.0 * PPCM, height / 2 - 1.0 * PPCM, 4.0 * PPCM, 3.0 * PPCM) && mouseClickWithin2(width / 2 - 2.0 * PPCM, height / 2 - 1.0 * PPCM, 4.0 * PPCM, 3.0 * PPCM, mouseX + dot_offset_x * PPCM, mouseY + dot_offset_y * PPCM)) {
            // Check if mouse click happened within the keyboard area
            if (mouseClickWithin2(...keyboard_bounds, mouseX + dot_offset_x * PPCM, mouseY + dot_offset_y * PPCM)) {
                let [row, col] = getKeyboardPressedKey();
                if (row != -1 && col != -1) {
                    current_letter = qwerty_keyboard[row][col];
                    if (current_letter == '_') {
                        currently_typed += " ";
                    }
                    else if (current_letter == '<-' && currently_typed.length > 0) {
                        currently_typed = currently_typed.substring(0, currently_typed.length - 1);
                    }
                    else if (current_letter != '<-') {
                        currently_typed += current_letter;
                    }
                    updateSuggestedWords();
                    tap.play();
                }
            }
            // Check if mouse click happened within the suggested words area
            else if (suggested_words.length > 0 && mouseClickWithin2(...suggested_words_bounds, mouseX + dot_offset_x * PPCM, mouseY + dot_offset_y * PPCM)) {
                let pressed_word = getPressedWord()
                if (pressed_word != -1) {
                    let splitted = currently_typed.split(" ");
                    splitted.pop();
                    splitted.push(pressed_word);
                    currently_typed = splitted.join(" ") + " ";
                    updateSuggestedWords();
                    tap.play();
                }
            }
        }
    }
}

// Resets variables for second attempt
function startSecondAttempt() {
    // Re-randomize the trial order (DO NOT CHANG THESE!)
    shuffle(phrases, true);
    current_trial = 0;
    target_phrase = phrases[current_trial];
    // Resets performance variables (DO NOT CHANG THESE!)
    letters_expected = 0;
    letters_entered = 0;
    errors = 0;
    currently_typed = "";
    CPS = 0;
    current_letter = 'a';
    // Show the watch and keyboard again
    second_attempt_button.remove();
    draw_finger_arm = true;
    attempt_start_time = millis();
}

// Print and save results at the end of 2 trials
function printAndSavePerformance() {
    // DO NOT CHANGE THESE
    let attempt_duration = (attempt_end_time - attempt_start_time) / 60000;          // 60K is number of milliseconds in minute
    let CPS = letters_entered / (attempt_duration * 60)
    let wpm = (letters_entered / 5.0) / attempt_duration;
    let freebie_errors = letters_expected * 0.05;                                  // no penalty if errors are under 5% of chars
    let penalty = max(0, (errors - freebie_errors) / attempt_duration);
    let wpm_w_penalty = max((wpm - penalty), 0);                                   // minus because higher WPM is better: NET WPM
    let timestamp = day() + "/" + month() + "/" + year() + "  " + hour() + ":" + minute() + ":" + second();
    background(color(0, 0, 0));    // clears screen
    cursor();                    // shows the cursor again
    textFont("Arial", 16);       // sets the font to Arial size 16
    fill(color(255, 255, 255));    //set text fill color to white
    text(timestamp, 100, 20);    // display time on screen 
    text("Finished attempt " + (attempt + 1) + " out of 2!", width / 2, height / 2);
    // For each trial/phrase
    let h = 20;
    for (i = 0; i < 2; i++, h += 40) {
        text("Target phrase " + (i + 1) + ": " + phrases[i], width / 2, height / 2 + h);
        text("User typed " + (i + 1) + ": " + entered[i], width / 2, height / 2 + h + 20);
    }
    text("CPS: " + CPS, width / 2, height / 2 + h);
    text("Raw WPM: " + wpm.toFixed(2), width / 2, height / 2 + h + 20);
    text("Freebie errors: " + freebie_errors.toFixed(2), width / 2, height / 2 + h + 40);
    text("Penalty: " + penalty.toFixed(2), width / 2, height / 2 + h + 60);
    text("WPM with penalty: " + wpm_w_penalty.toFixed(2), width / 2, height / 2 + h + 80);
    // Saves results (DO NOT CHANGE!)
    let attempt_data =
    {
        project_from: GROUP_NUMBER,
        assessed_by: student_ID,
        attempt_completed_by: timestamp,
        attempt: attempt,
        attempt_duration: attempt_duration,
        raw_wpm: wpm,
        freebie_errors: freebie_errors,
        penalty: penalty,
        wpm_w_penalty: wpm_w_penalty,
        cps: CPS
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

// Is invoked when the canvas is resized (e.g., when we go fullscreen)
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    let display = new Display({ diagonal: display_size }, window.screen);
    // DO NO CHANGE THESE!
    PPI = display.ppi;                        // calculates pixels per inch
    PPCM = PPI / 2.54;                         // calculates pixels per cm
    FINGER_SIZE = (int)(11 * PPCM);
    FINGER_OFFSET = (int)(0.8 * PPCM)
    ARM_LENGTH = (int)(19 * PPCM);
    ARM_HEIGHT = (int)(11.2 * PPCM);
    ARROW_SIZE = (int)(2.2 * PPCM);
    // Starts drawing the watch immediately after we go fullscreen (DO NO CHANGE THIS!)
    draw_finger_arm = true;
    attempt_start_time = millis();
}