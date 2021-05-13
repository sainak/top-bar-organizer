"use strict";

const ExtensionUtils = imports.misc.extensionUtils;

const Main = imports.ui.main;

class Extension {
    constructor() {
        this.settings = ExtensionUtils.getSettings();
    }

    enable() {
        this._addNewItemsToBoxOrders();
    }

    disable() {
    }

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
}

function init() {
    return new Extension();
}
