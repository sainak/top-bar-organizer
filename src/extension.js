"use strict";

const ExtensionUtils = imports.misc.extensionUtils;

const Main = imports.ui.main;

class Extension {
    constructor() {
        this.settings = ExtensionUtils.getSettings();
    }

    enable() {
        this._addNewItemsToBoxOrders();
        this._orderTopBarItems();
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

    /**
     * This method orders the top bar items according to the configured box
     * orders.
     */
    _orderTopBarItems() {
        // Get valid box orders.
        const validLeftBoxOrder = this._createValidBoxOrder("left");
        const validCenterBoxOrder = this._createValidBoxOrder("center");
        const validRightBoxOrder = this._createValidBoxOrder("right");
        
        // Go through the items (or rather their roles) of a box and order the
        // box accordingly.
        const orderBox = (boxOrder, box) => {
            for (let i = 0; i < boxOrder.length; i++) {
                const role = boxOrder[i];
                // Get the indicator container associated with the current role.
                const associatedIndicatorContainer = Main.panel.statusArea[role].container;

                box.set_child_at_index(associatedIndicatorContainer, i);
            }
        }

        // Order the top bar items.
        orderBox(validLeftBoxOrder, Main.panel._leftBox);
        orderBox(validCenterBoxOrder, Main.panel._centerBox);
        orderBox(validRightBoxOrder, Main.panel._rightBox);
    }

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
        // Load the configured box order from settings and get the indicator
        // containers (of the items) currently present in the Gnome Shell top
        // bar.
        let boxOrder;
        let boxIndicatorContainers;
        switch (box) {
            case "left":
                boxOrder = this.settings.get_strv("left-box-order");
                boxIndicatorContainers = Main.panel._leftBox.get_children();
                break;
            case "center":
                boxOrder = this.settings.get_strv("center-box-order");
                boxIndicatorContainers = Main.panel._centerBox.get_children();
                break;
            case "right":
                boxOrder = this.settings.get_strv("right-box-order");
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
}

function init() {
    return new Extension();
}
