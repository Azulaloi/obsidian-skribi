import * as CodeMirror from './codemirror/codemirror';
import SkribosPlugin from "./main";

// unused...
export function registerMirror(plugin: SkribosPlugin) {
    plugin.app.workspace.on("codemirror", (cm) => cm.setOption("mode", "skribi"))

    plugin.app.workspace.iterateCodeMirrors((cm) => {
        cm.setOption("mode", "skribi")
    })

    CodeMirror.defineMode("skribi", function(cfg, parCfg) {
        var skribiOverlay: CodeMirror.Mode<any> = {
            startState: function() {
                return {
                    ...CodeMirror.startState(CodeMirror.getMode(cfg, "javascript")),
                };
            },
            copyState: function(state: any) {
                return {
                    ...CodeMirror.startState(CodeMirror.getMode(cfg, "javascript")),
                }
            },
            token: function(stream: CodeMirror.StringStream, state: any) {
                var ch;
                // if (stream.match())
                if (stream.match("{")) {
                  while ((ch = stream.next()) != null)
                    if (ch == "}") {
                    //   stream.eat("}");
                      return `skribi ${CodeMirror.getMode({}, "javascript").token(stream, state)}`;
                    }
                }
                while (stream.next() != null && !stream.match("{", false)) {}
                return null;
            } 
        };
        
        
        return CodeMirror.overlayMode(CodeMirror.getMode(cfg, "hypermd"), skribiOverlay)
    })
}