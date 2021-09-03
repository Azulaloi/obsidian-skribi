import { MarkdownPostProcessorContext, normalizePath, parseFrontMatterStringArray, MarkdownRenderer, setIcon, MarkdownPreviewView } from "obsidian"
import SkribosPlugin from "src/main"

const extImg = ["bmp", "png", "jpg", "jpeg", "gif", "svg"]
const extAud = ["mp3", "wav", "m4a", "3gp", "flac", "ogg", "oga"]
const extVid = ["mp4", "webm", "ogv"]
const extTxt = ["md"]
const extPdf = ["pdf"]

/* Repairs media embeds that have been rendered to markdown */
export async function embedMedia (
  el: HTMLElement, 
  srcPath: string,
  plugin: SkribosPlugin
) {
  const catches = el.querySelectorAll("span.internal-embed") 

  for (let fish of Array.from(catches)) {
    if (fish.hasClass("is-loaded")) continue;

    let src = normalizePath(fish.getAttribute("src"))

    let dest = plugin.app.metadataCache.getFirstLinkpathDest(src, srcPath)
    let path = plugin.app.vault.adapter.getResourcePath(dest.path)
    
    if (dest) {
      let ext = dest.extension;

      if (extImg.contains(ext)) {// Embed Image
        fish.addClass("image-embed");
        
        fish.childNodes.forEach((n) => {fish.removeChild(n)})
        let nel = fish.createEl("img");
        nel.setAttribute("src", path)
        
      } else if (extAud.contains(ext)) { // Embed Audio
        fish.addClass("media-embed");
        fish.childNodes.forEach((n) => {fish.removeChild(n)})
        let nel = fish.createEl("audio", {"attr" :{"controls" : true}});
        nel.setAttribute("src", path)

      } else if (extVid.contains(ext)) { // Embed Video
        fish.childNodes.forEach((n) => {fish.removeChild(n)})

        let vidiv = fish.createEl("video", {"attr" : {"controls" : true}})
        vidiv.setAttribute("src", path)

      } else if (extTxt.contains(ext)) { 
        /* Embed Transclusion */
      
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

        let mkh = createDiv()
        MarkdownRenderer.renderMarkdown(read, mkh, srcPath, null)
        const mke: ChildNode[] = (Array.from(mkh?.childNodes || []).map((n) => {
          if (n.childNodes.length > 0) { let d = createDiv(); d.append(n.cloneNode(true)); return d;} else return n;}));
        ps.append(...mke)
        embedMedia(ps, srcPath, plugin ) // Recurse embedder on transcluded media
      }
    }
  }

  return el;
}