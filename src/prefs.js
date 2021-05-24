/*
 * This file is part of Top-Bar-Organizer (a Gnome Shell Extension for
 * organizing your Gnome Shell top bar).
 * Copyright (C) 2021 Julian Schacher
 *
 * Top-Bar-Organizer is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
/* exported buildPrefsWidget, init */
"use strict";

const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GObject = imports.gi.GObject;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var PrefsBoxOrderListEmptyPlaceholder = GObject.registerClass({
    GTypeName: "PrefsBoxOrderListEmptyPlaceholder",
    Template: Me.dir.get_child("prefs-box-order-list-empty-placeholder.ui").get_uri()
}, class PrefsBoxOrderListEmptyPlaceholder extends Gtk.Box {
    _init(params = {}) {
        super._init(params);

        /// Make `this` accept drops by creating a drop target and adding it to
        /// `this`.
        let dropTarget = new Gtk.DropTarget();
        dropTarget.set_gtypes([GObject.type_from_name("PrefsBoxOrderItemRow")]);
        dropTarget.set_actions(Gdk.DragAction.MOVE);
        // Handle a new drop on `this` properly.
        // `value` is the thing getting dropped.
        dropTarget.connect("drop", (target, value) => {
            // Get the GtkListBoxes of `this` and the drop value.
            const ownListBox = this.get_parent();
            const valueListBox = value.get_parent();

            // Remove the drop value from its list box.
            valueListBox.remove(value);

            // Insert the drop value into the list box of `this`.
            ownListBox.insert(value, 0);

            /// Finally save the box orders to settings.
            const settings = ExtensionUtils.getSettings();

            settings.set_strv(ownListBox.boxOrder, [value.item]);

            let updatedBoxOrder = [ ];
            for (let potentialListBoxRow of valueListBox) {
                // Only process PrefsBoxOrderItemRows.
                if (potentialListBoxRow.constructor.$gtype.name !== "PrefsBoxOrderItemRow") {
                    continue;
                }

                const item = potentialListBoxRow.item;
                updatedBoxOrder.push(item);
            }
            settings.set_strv(valueListBox.boxOrder, updatedBoxOrder);
        });
        this.add_controller(dropTarget);
    }
});

var PrefsBoxOrderItemRow = GObject.registerClass({
    GTypeName: "PrefsBoxOrderItemRow",
    Template: Me.dir.get_child("prefs-box-order-item-row.ui").get_uri(),
    Children: ["item-name-display-label"]
}, class PrefsBoxOrderItemRow extends Gtk.ListBoxRow {
    _init(params = {}) {
        super._init(params);

        // Make `this` draggable by creating a drag source and adding it to
        // `this`.
        let dragSource = new Gtk.DragSource();
        dragSource.set_actions(Gdk.DragAction.MOVE);
        dragSource.connect("prepare", () => {
            return Gdk.ContentProvider.new_for_value(this);
        });
        this.add_controller(dragSource);

        /// Make `this` accept drops by creating a drop target and adding it to
        /// `this`.
        let dropTarget = new Gtk.DropTarget();
        dropTarget.set_gtypes([this.constructor.$gtype]);
        dropTarget.set_actions(Gdk.DragAction.MOVE);
        // Handle a new drop on `this` properly.
        // `value` is the thing getting dropped.
        dropTarget.connect("drop", (target, value) => {
            // If `this` got dropped onto itself, do nothing.
            if (value === this) {
                return;
            }

            // Get the GtkListBoxes of `this` and the drop value.
            const ownListBox = this.get_parent();
            const valueListBox = value.get_parent();

            // Get the position of `this` and the drop value.
            const ownPosition = this.get_index();
            const valuePosition = value.get_index();

            // Remove the drop value from its list box.
            valueListBox.remove(value);

            // Since an element got potentially removed from the list of `this`,
            // get the position of `this` again.
            const updatedOwnPosition = this.get_index();

            if (ownListBox !== valueListBox) {
                // First handle the case where `this` and the drop value are in
                // different list boxes.
                if ((ownListBox.boxOrder === "right-box-order" && valueListBox.boxOrder === "left-box-order")
                    || (ownListBox.boxOrder === "right-box-order" && valueListBox.boxOrder === "center-box-order")
                    || (ownListBox.boxOrder === "center-box-order" && valueListBox.boxOrder === "left-box-order")) {
                    // If the list box of the drop value comes before the list
                    // box of `this`, add the drop value after `this`.
                    ownListBox.insert(value, updatedOwnPosition + 1);
                } else {
                    // Otherwise, add the drop value where `this` currently is.
                    ownListBox.insert(value, updatedOwnPosition);
                }
            } else {
                if (valuePosition < ownPosition) {
                    // If the drop value was before `this`, add the drop value
                    // after `this`.
                    ownListBox.insert(value, updatedOwnPosition + 1);
                } else {
                    // Otherwise, add the drop value where `this` currently is.
                    ownListBox.insert(value, updatedOwnPosition);
                }
            }

            /// Finally save the box orders to settings.
            const settings = ExtensionUtils.getSettings();

            let updatedBoxOrder = [ ];
            for (let potentialListBoxRow of ownListBox) {
                // Only process PrefsBoxOrderItemRows.
                if (potentialListBoxRow.constructor.$gtype.name !== "PrefsBoxOrderItemRow") {
                    continue;
                }

                const item = potentialListBoxRow.item;
                updatedBoxOrder.push(item);
            }
            settings.set_strv(ownListBox.boxOrder, updatedBoxOrder);

            // If the list boxes of `this` and the drop value were different,
            // save an updated box order for the list were the drop value was in
            // as well.
            if (ownListBox !== valueListBox) {
                let updatedBoxOrder = [ ];
                for (let potentialListBoxRow of valueListBox) {
                    // Only process PrefsBoxOrderItemRows.
                    if (potentialListBoxRow.constructor.$gtype.name !== "PrefsBoxOrderItemRow") {
                        continue;
                    }

                    const item = potentialListBoxRow.item;
                    updatedBoxOrder.push(item);
                }
                settings.set_strv(valueListBox.boxOrder, updatedBoxOrder);
            }
        });
        this.add_controller(dropTarget);
    }
});

var PrefsWidget = GObject.registerClass({
    GTypeName: "PrefsWidget",
    Template: Me.dir.get_child("prefs-widget.ui").get_uri(),
    InternalChildren: [
        "left-box-order",
        "center-box-order",
        "right-box-order"
    ]
}, class PrefsWidget extends Gtk.Box {
    _init(params = {}) {
        super._init(params);

        this._settings = ExtensionUtils.getSettings();

        // Initialize the given `gtkListBox`.
        const initializeGtkListBox = (boxOrder, gtkListBox) => {
            // Add the items of the given configured box order as
            // GtkListBoxRows.
            for (const item of boxOrder) {
                const listBoxRow = new PrefsBoxOrderItemRow();

                listBoxRow.item = item;
                if (item.startsWith("appindicator-kstatusnotifieritem-")) {
                    // Set `item_name_display_label` of the `listBoxRow` to
                    // something nicer, if the associated item is an
                    // AppIndicator/KStatusNotifierItem item.
                    listBoxRow.item_name_display_label.set_label(item.replace("appindicator-kstatusnotifieritem-", ""));
                } else {
                    // Otherwise just set the `item_name_display_label` of the
                    // `listBoxRow` to `item`.
                    listBoxRow.item_name_display_label.set_label(item);
                }
                gtkListBox.append(listBoxRow);
            }

            // Add a placeholder widget for the case, where `gtkListBox` doesn't
            // have any GtkListBoxRows.
            gtkListBox.set_placeholder(new PrefsBoxOrderListEmptyPlaceholder());
        };

        initializeGtkListBox(this._settings.get_strv("left-box-order"), this._left_box_order);
        initializeGtkListBox(this._settings.get_strv("center-box-order"), this._center_box_order);
        initializeGtkListBox(this._settings.get_strv("right-box-order"), this._right_box_order);

        // Set the box order each GtkListBox is associated with.
        // This is needed by the reordering of the GtkListBoxRows, so that the
        // updated box orders can be saved.
        this._left_box_order.boxOrder = "left-box-order";
        this._center_box_order.boxOrder = "center-box-order";
        this._right_box_order.boxOrder = "right-box-order";
    }
});

function buildPrefsWidget() {
    return new PrefsWidget();
}

function init() {
}
