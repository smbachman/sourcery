CodeMirrorREPL.prototype.isBalanced = function () {
    return true;
};

CodeMirrorREPL.prototype.eval = function () {};

function CodeMirrorREPL(textareaId, options) {
    var textarea = document.getElementById(textareaId);
    options = options || {};
    textarea.value = "";

    var keymap = {
        "Up": up,
        "Down": down,
        "Delete": del,
        "Ctrl-Z": undo,
        "Enter": enter,
        "Ctrl-A": select,
        "Ctrl-Delete": del,
        "Shift-Enter": enter,
        "Backspace": backspace,
        "Ctrl-Backspace": backspace
    };

    var options = {
        electricChars: false,
        theme: options.theme,
        mode: options.mode,
        smartIndent: false,
        lineWrapping: true,
        extraKeys: keymap,
        onChange: change,
        indentUnit: 4,
        undoDepth: 1,
        gutters: ["prompt"]
    };

    mirror = CodeMirror.fromTextArea(textarea, options);

    var history = [];
    var buffer = [];
    var repl = this;
    var user = true;
    var text = "";
    var line = 0;
    var ch = 0;
    var n = 0;

    repl.print = print;
    repl.setMode = setMode;
    repl.setTheme = setTheme;
    mirror.setGutterMarker(line, "prompt", document.createTextNode(">>"));

    function undo() {}

    function up() {
        switch (n--) {
        case 0:
            n = 0;
            return;
        case history.length:
            text = mirror.getLine(line).slice(ch);
        }

        mirror.replaceRange(history[n], {line: line, ch: 0}, {line: line});
    }

    function down() {
        switch (n++) {
        case history.length:
            n--;
            return;
        case history.length - 1:
            mirror.replaceRange(text, {line: line, ch: 0}, {line: line});
            return;
        }

        mirror.replaceRange(history[n], {line: line, ch:0}, {line: line});
    }

    function enter() {
        var text = mirror.getLine(line);
        var input = text.slice(ch);
        user = false;

        if (text) {
            ch = 0;
            buffer.push(input);
            n = history.push(input);
            mirror.replaceRange(text + '\n', {line: line++, ch: 0}, {line: line});
            var code = buffer.join('\n').replace(/\r/g, '\n');
            var balanced = repl.isBalanced(code);

            if (balanced) {
                repl.eval(code);
                buffer.length = 0;
                mirror.setGutterMarker(line, "prompt", document.createTextNode(">>"));
            } else {
                if (balanced === null) {
                    buffer.pop();
                    code = buffer.join('\n').replace('\r', '\n');
                    mirror.setGutterMarker(line, "prompt",  document.createTextNode(repl.isBalanced(code) ? ">>" : ".."));
                } else mirror.setGutterMarker(line, "prompt", document.createTextNode(".."));
            }
        }

        setTimeout(function () {
            user = true;
        }, 0);
    }

    function select() {
        var length = mirror.getLine(line).slice(ch).length;
        mirror.setSelection({line: line, ch: 0}, {line: line, ch: length});
    }

    function backspace() {
        var selected = mirror.somethingSelected();
        var cursor = mirror.getCursor(true);
        var ln = cursor.line;
        var c = cursor.ch;

        if (ln === line && c >= ch + (selected ? 0 : 1)) {
            if (!selected) mirror.setSelection({line: ln, ch: c - 1}, cursor);
            mirror.replaceSelection("");
        }
    }

    function del() {
        var cursor = mirror.getCursor(true);
        var ln = cursor.line;
        var c = cursor.ch;

        if (ln === line && c < mirror.getLine(ln).length && c >= ch) {
            if (!mirror.somethingSelected()) mirror.setSelection({line: ln, ch: c + 1}, cursor);
            mirror.replaceSelection("");
        }
    }

    function change(mirror, changes) {
        var to = changes.to;
        var from = changes.from;
        var text = changes.text;
        var next = changes.next;
        var length = text.length;

        if (user) {
            if (from.line < line || from.ch < ch) mirror.undo();
            else if (length-- > 1) {
                mirror.undo();

                var ln = mirror.getLine(line).slice(ch);
                text[0] = ln.slice(0, from.ch) + text[0];

                for (var i = 0; i < length; i++) {
                    mirror.replaceRange(text[i], {line: line, ch: 0}, {line: line});
                    enter();
                }

                mirror.replaceRange(text[length] + ln.slice(to.ch), {line: line, ch: 0}, {line: line});
            }
        }

        if (next) change(mirror, next);
    }

    function print(message, className) {
        var mode = user;
        var ln = line;
        user = false;

        message = String(message);
        var text = mirror.getLine(line);
        message = message.replace(/\n/g, '\r') + '\n';

        if (text) {
            mirror.setGutterMarker(line, "prompt", createTextNode(""));
            var cursor = mirror.getCursor().ch;
        }
        
        mirror.replaceRange(message, {line: line++, ch: 0}, {line: line});
        if (className) mirror.markText({line: ln, ch: 0}, {line: ln, ch: message.length}, className);

        if (text) {
            mirror.replaceRange(text, {line: line, ch:0}, {line: line});            
            mirror.setGutterMarker(line, "prompt", createTextNode(">>"));
            mirror.setCursor({line: line, ch: cursor});
        }

        setTimeout(function () {
            user = mode;
        }, 0);
    }

    function setMode(mode) {
        mirror.setOption("mode", mode);
    }

    function setTheme(theme) {
        mirror.setOption("theme", theme);
    }
}
