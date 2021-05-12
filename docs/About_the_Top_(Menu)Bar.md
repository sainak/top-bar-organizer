# About the Top (Menu)Bar

First of all, here are some Gnome Shell Design references for the top (menu)bar:

- <https://wiki.gnome.org/Projects/GnomeShell/Design> (see: Components -> Top Bar)
- <https://people.gnome.org/~mccann/shell/design/GNOME_Shell-20091114.pdf> (see: Components -> Top Menubar)

The top bar is an instance of Panel.  
The Panel class is defined in [`panel.js`](https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/master/js/ui/panel.js) and you can find an annotated version of `panel.js` in the `panel.js` of this repo.

### Initialization of the Top Bar

The top bar gets initialized by `Panel._init()` and `Panel._update()`.
These functions basically make sure, that the top bar has a `Panel._leftBox`, `Panel._centerBox` and `Panel._rightBox` with the default items like `activities`, `appMenu` and so on.

### Adding Items to the Top Bar

Extensions can add new items to the top bar using `Panel.addToStatusArea()`.

### About `Panel._addToPanelBox`

#### Indicator

`Panel._somethingBox` is an instance of [`St.BoxLayout`](https://gjs-docs.gnome.org/st10~1.0_api/st.boxlayout).  
`Panel._addToPanelBox`, then uses `Panel._somethingBox.insert_child_at_index` (which is a method `Panel._somethingBox` inherits from [`Clutter.Actor`](https://gjs-docs.gnome.org/clutter7/clutter.actor)) to add an indicator container to the relevant box.

#### Role

`Panel._addToPanelBox` then saves the indicator into `Panel.statusArea` using the role as an index.
