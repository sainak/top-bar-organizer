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
"use strict";

const ExtensionUtils = imports.misc.extensionUtils;

const Main = imports.ui.main;
const Panel = imports.ui.panel;

class Extension {
    constructor() {
        this.settings = ExtensionUtils.getSettings();
    }

    enable() {
        // Create an application-role map for associating roles with
        // applications.
        // This is needed to handle AppIndicator/KStatusNotifierItem items.
        this._applicationRoleMap = new Map();

        this._addNewItemsToBoxOrders();
        this._orderTopBarItemsOfAllBoxes();
        this._overwritePanelAddToPanelBox();

        // Handle changes of configured box orders.
        this._settingsHandlerIds = [ ];

        const addConfiguredBoxOrderChangeHandler = (box) => {
            let handlerId = this.settings.connect(`changed::${box}-box-order`, () => {
                this._orderTopBarItems(box);
            });
            this._settingsHandlerIds.push(handlerId);
        }

        addConfiguredBoxOrderChangeHandler("left");
        addConfiguredBoxOrderChangeHandler("center");
        addConfiguredBoxOrderChangeHandler("right");
    }

    disable() {
        // Revert the overwrite of `Panel._addToPanelBox`.
        Panel.Panel.prototype._addToPanelBox = Panel.Panel.prototype._originalAddToPanelBox;

        // Disconnect signals.
        for (const handlerId of this._settingsHandlerIds) {
            this.settings.disconnect(handlerId);
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    /// Methods used on extension enable.                                    ///
    ////////////////////////////////////////////////////////////////////////////

    /**
     * This method adds all new items currently present in the Gnome Shell top
     * bar to the box orders.
     */
    _addNewItemsToBoxOrders() {
        // Load the configured box orders from settings.
        let leftBoxOrder = this.settings.get_strv("left-box-order");
        let centerBoxOrder = this.settings.get_strv("center-box-order");
        let rightBoxOrder = this.settings.get_strv("right-box-order");

        // Get items (or rather their roles) currently present in the Gnome
        // Shell top bar and index them using their associated indicator
        // container.
        let indicatorContainerRoleMap = new Map();
        for (const role in Main.panel.statusArea) {
            indicatorContainerRoleMap.set(Main.panel.statusArea[role].container, role);
        }

        // Get the indicator containers (of the items) currently present in the
        // Gnome Shell top bar.
        const leftBoxIndicatorContainers = Main.panel._leftBox.get_children();
        const centerBoxIndicatorContainers = Main.panel._centerBox.get_children();
        // Reverse this array, since the items in the left and center box are
        // logically LTR, while the items in the right box are RTL.
        const rightBoxIndicatorContainers = Main.panel._rightBox.get_children().reverse();

        // Go through the items (or rather their indicator containers) of each
        // box and add new items (or rather their roles) to the box orders.
        const addNewRolesToBoxOrder = (boxIndicatorContainers, boxOrder, atToBeginning = false) => {
            // Create a box order set from the box order for fast easy access.
            const boxOrderSet = new Set(boxOrder);

            for (const indicatorContainer of boxIndicatorContainers) {
                // First get the role associated with the current indicator
                // container.
                const associatedRole = indicatorContainerRoleMap.get(indicatorContainer);

                // Handle an AppIndicator/KStatusNotifierItem item differently.
                if (associatedRole.startsWith("appindicator-")) {
                    this._handleAppIndicatorKStatusNotifierItemItem(indicatorContainer, associatedRole, boxOrder, atToBeginning);
                    continue;
                }

                // Add the role to the box order, if it isn't in it already.
                if (!boxOrderSet.has(associatedRole)) {
                    if (atToBeginning) {
                        boxOrder.unshift(associatedRole);
                    } else {
                        boxOrder.push(associatedRole);
                    }
                }
            }
        }

        // Add new items (or rather their roles) to the box orders and save
        // them.
        addNewRolesToBoxOrder(leftBoxIndicatorContainers, leftBoxOrder);
        addNewRolesToBoxOrder(centerBoxIndicatorContainers, centerBoxOrder);
        // Add the items to the beginning for this array, since its RTL.
        addNewRolesToBoxOrder(rightBoxIndicatorContainers, rightBoxOrder, true);
        this.settings.set_strv("left-box-order", leftBoxOrder);
        this.settings.set_strv("center-box-order", centerBoxOrder);
        this.settings.set_strv("right-box-order", rightBoxOrder);
    }

    /**
     * This methods orders the top bar items of all boxes according to the
     * configured box orders using `this._orderTopBarItems`.
     */
    _orderTopBarItemsOfAllBoxes() {
        this._orderTopBarItems("left");
        this._orderTopBarItems("center");
        this._orderTopBarItems("right");
    }

    /**
     * Overwrite `Panel._addToPanelBox` with a custom method, which handles top
     * bar item additions to make sure that they are added in the correct
     * position.
     */
     _overwritePanelAddToPanelBox() {
        // Add the original `Panel._addToPanelBox` method as
        // `Panel._originalAddToPanelBox`.
        Panel.Panel.prototype._originalAddToPanelBox = Panel.Panel.prototype._addToPanelBox;

        // This function gets used by the `Panel._addToPanelBox` overwrite to
        // determine the position for a new item.
        // It also adds the new item to the relevant box order, if it isn't in
        // it already.
        const getPositionOverwrite = (role, box, indicator) => {
            let boxOrder;

            // Handle the case where the new item is a
            // AppIndicator/KStatusNotifierItem.
            if (role.startsWith("appindicator-")) {
                switch (box) {
                    case "left":
                        boxOrder = this.settings.get_strv("left-box-order");
                        this._handleAppIndicatorKStatusNotifierItemItem(indicator.container, role, boxOrder);
                        this.settings.set_strv("left-box-order", boxOrder);
                        break;
                    case "center":
                        boxOrder = this.settings.get_strv("center-box-order");
                        this._handleAppIndicatorKStatusNotifierItemItem(indicator.container, role, boxOrder);
                        this.settings.set_strv("center-box-order", boxOrder);
                        break;
                    case "right":
                        boxOrder = this.settings.get_strv("right-box-order");
                        this._handleAppIndicatorKStatusNotifierItemItem(indicator.container, role, boxOrder, true);
                        this.settings.set_strv("right-box-order", boxOrder);
                        break;
                }
            }

            // Get the resolved box order for the box order.
            boxOrder = this._createResolvedBoxOrder(box);
            // Also get the valid box order.
            const validBoxOrder = this._createValidBoxOrder(box);

            // Get the index of the role in the box order.
            const index = boxOrder.indexOf(role);

            // If the role is not already configured in the box order, just add
            // it to the box order at the end/beginning, save the updated box
            // order and return the relevant position.
            if (index === -1) {
                switch (box) {
                    // For the left and center box, insert the role at the end,
                    // since they're LTR.
                    case "left":
                        boxOrder.push(role);
                        this.settings.set_strv("left-box-order", boxOrder);
                        return validBoxOrder.length - 1;
                    case "center":
                        boxOrder.push(role);
                        this.settings.set_strv("center-box-order", boxOrder);
                        return validBoxOrder.length - 1;
                    // For the right box, insert the role at the beginning,
                    // since it's RTL.
                    case "right":
                        boxOrder.unshift(role);
                        this.settings.set_strv("right-box-order", boxOrder);
                        return 0;
                }
            }

            // Since the role is already configured in the box order, determine
            // the correct insertion index for the position.

            // Set the insertion index initially to 0, so that if no closest
            // item can be found, the new item just gets inserted at the
            // beginning.
            let insertionIndex = 0;

            // Find the index of the closest item, which is also in the valid
            // box order and before the new item.
            // This way, we can insert the new item just after the index of this
            // closest item.
            for (let i = index - 1; i >= 0; i--) {
                let potentialClosestItemIndex = validBoxOrder.indexOf(boxOrder[i]);
                if (potentialClosestItemIndex !== -1) {
                    insertionIndex = potentialClosestItemIndex + 1;
                    break;
                }
            }

            return insertionIndex;
        }

        // Overwrite `Panel._addToPanelBox`.
        Panel.Panel.prototype._addToPanelBox = function (role, indicator, position, box) {
            // Get the position overwrite.
            let positionOverwrite;
            switch (box) {
                case this._leftBox:
                    positionOverwrite = getPositionOverwrite(role, "left", indicator);
                    break;
                case this._centerBox:
                    positionOverwrite = getPositionOverwrite(role, "center", indicator);
                    break;
                case this._rightBox:
                    positionOverwrite = getPositionOverwrite(role, "right", indicator);
                    break;
            }

            // Call the original `Panel._addToPanelBox` with the position
            // overwrite as the position argument.
            this._originalAddToPanelBox(role, indicator, positionOverwrite, box);
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    /// Helper methods holding logic needed by other methods.                ///
    ////////////////////////////////////////////////////////////////////////////

    /**
     * This function creates a valid box order for the given box.
     * @param {string} box - The box to return the valid box order for.
     * Must be one of the following values:
     * - "left"
     * - "center"
     * - "right"
     * @returns {string[]} - The valid box order.
     */
    _createValidBoxOrder(box) {
        // Get a resolved box order and get the indicator containers (of the
        // items) currently present in the Gnome Shell top bar.
        let boxOrder = this._createResolvedBoxOrder(box);
        let boxIndicatorContainers;
        switch (box) {
            case "left":
                boxIndicatorContainers = Main.panel._leftBox.get_children();
                break;
            case "center":
                boxIndicatorContainers = Main.panel._centerBox.get_children();
                break;
            case "right":
                boxIndicatorContainers = Main.panel._rightBox.get_children();
                break;
        }

        // Create an indicator containers set from the indicator containers for
        // fast easy access.
        const boxIndicatorContainersSet = new Set(boxIndicatorContainers);

        // Go through the box order and only add items to the valid box order,
        // where their indicator is present in the Gnome Shell top bar
        // currently.
        let validBoxOrder = [ ];
        for (const role of boxOrder) {
            // Get the indicator container associated with the current role.
            const associatedIndicatorContainer = Main.panel.statusArea[role]?.container;

            if (boxIndicatorContainersSet.has(associatedIndicatorContainer)) validBoxOrder.push(role);
        }

        return validBoxOrder;
    }

    /**
     * This method orders the top bar items of the specified box according to
     * the configured box orders.
     * @param {string} box - The box to order.
     */
    _orderTopBarItems(box) {
        // Get the valid box order.
        const validBoxOrder = this._createValidBoxOrder(box);

        // Get the relevant box of `Main.panel`.
        let panelBox;
        switch (box) {
            case "left":
                panelBox = Main.panel._leftBox;
                break;
            case "center":
                panelBox = Main.panel._centerBox;
                break;
            case "right":
                panelBox = Main.panel._rightBox;
                break;
        }

        // Go through the items (or rather their roles) of the validBoxOrder and
        // order the panelBox accordingly.
        for (let i = 0; i < validBoxOrder.length; i++) {
            const role = validBoxOrder[i];
            // Get the indicator container associated with the current role.
            const associatedIndicatorContainer = Main.panel.statusArea[role].container;

            panelBox.set_child_at_index(associatedIndicatorContainer, i);
        }
    }

    /**
     * Handle an AppIndicator/KStatusNotifierItem item.
     *
     * This function basically does the following two things:
     * - Associate the role of the given item with the application of the
     *   AppIndicator/KStatusNotifierItem.
     * - Add a placeholder for the roles associated with the application of the
     *   AppIndiciator/KStatusNotifierItem to the box order, if needed.
     *
     * Note: The caller is responsible for saving the updated box order to
     * settings.
     * @param {} indicatorContainer - The container of the indicator of the
     * AppIndicator/KStatusNotifierItem item.
     * @param {string} role - The role of the AppIndicator/KStatusNotifierItem
     * item.
     * @param {string[]} - The box order the placeholder should be added to, if
     * needed.
     * @param {boolean} - Whether to add the placeholder to the beginning of the
     * box order.
     */
    _handleAppIndicatorKStatusNotifierItemItem(indicatorContainer, role, boxOrder, atToBeginning = false) {
        // Get the application the AppIndicator/KStatusNotifierItem is
        // associated with.
        const application = indicatorContainer.get_child()._indicator.id;

        // Associate the role with the application.
        let roles = this._applicationRoleMap.get(application);
        if (roles) {
            // If the application already has an array of associated roles, just
            // add the role to it.
            roles.push(role);
        } else {
            // Otherwise create a new array.
            this._applicationRoleMap.set(application, [ role ]);
        }

        // Store a placeholder for the roles associated with the application in
        // the box order, if needed.
        // (Then later the placeholder can be replaced with the relevant roles
        // using `this._applicationRoleMap`.)
        const placeholder = `appindicator-kstatusnotifieritem-${application}`;
        if (!boxOrder.includes(placeholder)) {
            if (atToBeginning) {
                boxOrder.unshift(placeholder);
            } else {
                boxOrder.push(placeholder);
            }
        }
    }

    /**
     * This function returns a box order for the specified box, where the
     * placeholders are replaced with the relevant roles.
     * @param {string} box - The box of which to get the resolved box order.
     */
    _createResolvedBoxOrder(box) {
        const boxOrder = this.settings.get_strv(`${box}-box-order`);

        let resolvedBoxOrder = [ ];
        for (const item of boxOrder) {
            // If the item isn't a placeholder, just add it to the new resolved
            // box order.
            if (!item.startsWith("appindicator-kstatusnotifieritem-")) {
                resolvedBoxOrder.push(item);
                continue;
            }

            /// If the item is a placeholder, replace it.
            // First get the application this placeholder is associated with.
            const application = item.replace("appindicator-kstatusnotifieritem-", "");

            // Then get the roles associated with the application.
            let roles = this._applicationRoleMap.get(application);

            // Continue, if there are no roles.
            if (!roles) continue;
            // Otherwise add the roles
            for (const role of roles) {
                resolvedBoxOrder.push(role);
            }
        }

        return resolvedBoxOrder;
    }
}

function init() {
    return new Extension();
}
