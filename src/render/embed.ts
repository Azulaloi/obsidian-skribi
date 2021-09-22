import { MarkdownPostProcessorContext, normalizePath, parseFrontMatterStringArray, MarkdownRenderer, setIcon, MarkdownPreviewView } from "obsidian"
import SkribosPlugin from "src/main"
import { createRegent } from "./regent"
import { dLog, isExtant } from "../util"

const extImg = ["bmp", "png", "jpg", "jpeg", "gif", "svg"]
const extAud = ["mp3", "wav", "m4a", "3gp", "flac", "ogg", "oga"]
const extVid = ["mp4", "webm", "ogv"]
const extTxt = ["md"]
const extPdf = ["pdf"]

/* Repairs media embeds that have been rendered to markdown */
export async function embedMedia (
  el: HTMLElement, 
  srcPath: string,
  plugin: SkribosPlugin,
  depth?: number,
  self?: boolean
) {
  dLog("embed self:", self)
  dLog("embed:", el)
  var proms: Promise<void>[] = []

  const catches = el.querySelectorAll("span.internal-embed") 

  let elDepth = el.getAttribute("depth");
  let d = (isExtant(elDepth) ? parseInt(elDepth) : isExtant(depth) ? depth : 0)

  dLog("embedder depth:", d)


  for (let fish of Array.from(catches)) {
    if (fish.hasClass("is-loaded")) continue;

    let src = normalizePath(fish.getAttribute("src"))

    let dest = plugin.app.metadataCache.getFirstLinkpathDest(src, srcPath)
    
    if (dest) {
      let path = plugin.app.vault.adapter.getResourcePath(dest.path)

      let ext = dest.extension;

      if (extImg.contains(ext)) {// Embed Image
        fish.addClass("image-embed");
        
        fish.childNodes.forEach((n) => {fish.removeChild(n)})
        let nel = fish.createEl("img");
        nel.setAttribute("src", path)
        
      } else if (extAud.contains(ext)) { // Embed Audio
        fish.addClass("media-embed");
        fish.childNodes.forEach((n) => {fish.removeChild(n)})
        let nel = fish.createEl("audio", {"attr": {"controls" : true}});
        nel.setAttribute("src", path)

      } else if (extVid.contains(ext)) { // Embed Video
        fish.childNodes.forEach((n) => {fish.removeChild(n)})

        let vidiv = fish.createEl("video", {"attr" : {"controls" : true}})
        vidiv.setAttribute("src", path)

      } else if (extTxt.contains(ext)) { 
        /* Embed Transclusion */

        const createEmbedPromise: ()=>Promise<void> = () => {
          return new Promise (async () => {
            dLog("new embed prom")

            fish.childNodes.forEach((n) => {fish.removeChild(n)})
  
              let cache = plugin.app.metadataCache.getCache(dest.path)
              let read = await plugin.app.vault.cachedRead(dest)
              let classes = parseFrontMatterStringArray(cache?.frontmatter, "cssclass")
    
              let div = fish.createDiv({cls: "markdown-embed"})
              let divtitle = div.createDiv({cls: "markdown-embed-title", text: dest.basename})
              let content = div.createDiv({cls: "markdown-embed-content"})
              let link = div.createDiv({cls: "markdown-embed-link"})
              setIcon(link, "link")
              link.onClickEvent((e) => {
                e.preventDefault();
                plugin.app.workspace.openLinkText(src, srcPath);
              })
    
              let pv = content.createDiv({cls: "markdown-preview-view"}); pv.addClazz(classes);
              let ps = pv.createDiv({cls: "markdown-preview-sizer markdown-preview-section"})
    
              let mkh = createDiv({attr: {"depth": depth.toString()}})
              await MarkdownRenderer.renderMarkdown(read, mkh, srcPath, null)
              const mke: ChildNode[] = (Array.from(mkh?.childNodes || []).map((n) => {
                // if (n.childNodes.length > 0) { let d = createDiv(); d.append(n.cloneNode(true)); return d;} else return n;}));
                if (n.childNodes.length > 0) { let d = createDiv(); d.append(n); return d;} else return n;}));

              ps.append(...mke); //ps.setAttribute("depth", d.toString())
                            
              return embedMedia(ps, srcPath, plugin, d-1, true)
          })
        }

        if (d <= 0)  {
          let [l] = createRegent({class: "depth-limit", hover: "It goes on forever..."})
          fish.replaceWith(l)

          dLog("embedder hit limit")
        } else {
          proms.push(createEmbedPromise())
        }
      }
    }
  }

  return Promise.allSettled(proms).then(values => {
    dLog("embedder done", proms)
    return Promise.resolve(proms.length)
  })
}