"use strict";

const ExtensionUtils = imports.misc.extensionUtils;

const Main = imports.ui.main;
const Panel = imports.ui.panel;

class Extension {
    constructor() {
        this.settings = ExtensionUtils.getSettings();
    }

    enable() {
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
     * This methods orders the top bar items of all boxes according to the
     * configured box orders using `this._orderTopBarItems`.
     */
    _orderTopBarItemsOfAllBoxes() {
        this._orderTopBarItems("left");
        this._orderTopBarItems("center");
        this._orderTopBarItems("right");
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
        const getPositionOverwrite = (role, box) => {
            let boxOrder;
            let validBoxOrder;

            switch (box) {
                case "left":
                    boxOrder = this.settings.get_strv("left-box-order");
                    validBoxOrder = this._createValidBoxOrder("left");
                    break;
                case "center":
                    boxOrder = this.settings.get_strv("center-box-order");
                    validBoxOrder = this._createValidBoxOrder("center");
                    break;
                case "right":
                    boxOrder = this.settings.get_strv("right-box-order");
                    validBoxOrder = this._createValidBoxOrder("right");
                    break;
            }

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
                    positionOverwrite = getPositionOverwrite(role, "left");
                    break;
                case this._centerBox:
                    positionOverwrite = getPositionOverwrite(role, "center");
                    break;
                case this._rightBox:
                    positionOverwrite = getPositionOverwrite(role, "right");
                    break;
            }

            // Call the original `Panel._addToPanelBox` with the position
            // overwrite as the position argument.
            this._originalAddToPanelBox(role, indicator, positionOverwrite, box);
        }
    }
}

function init() {
    return new Extension();
}
