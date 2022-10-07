# Index Modals

There are a number of modals that display potentially helpful indices.

## Template Index

An index of your templates, split into three categories. Each entry is listed with a tag denoting the file extension type, followed by the entry name. Files with the extension `.md` may be clicked on to open the source file in Obsidian.

The list will automatically refresh whenever the template cache is updated, which occurs when a template is edited. Thus, you may leave the index open while you edit templates in an external editor, and see their entry move to/from the error list immediately. You may also force the list to refresh with the **Refresh Index** button, just in case.

The **Recompile All** button does exactly that: tells Skribi to recompile all templates, as if it were loading. The list is then refreshed.

Categories:
- **Errored Templates**: If any templates failed to compile, they will be displayed in this category. Such templates will have an error indicator displayed that you can click to open an error modal with more information. 
- **Templates**: Templates that loaded normally.  
- **Style Snippets**: Loaded <a href='../syntax/style'>stylesheets</a>, aka any file in the template directory with the `.css` extension. Like the *Errored Templates* list, this list will not appear if no stylesheets were loaded. Note that stylesheets are currently not evaluated for validity, and so will not encounter or display errors like templates do, regardless of whether or not they contain valid CSS.

## Script Index

An index of your scripts, split into two categories: **Errored Scripts** and **Scripts**. Like the Template Index, the **Refresh Index** and **Recompile All** buttons will refresh the index and recompile all scripts, respectively.

Script files that failed to load will be in **Errored Scripts**, with an error indicator that may be clicked to display a more detailed error modal.

Script files that loaded will be in **Scripts**.