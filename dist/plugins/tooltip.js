/*
taucharts@2.0.0-beta.35 (2018-01-11)
Copyright 2018 Targetprocess, Inc.
Licensed under Apache License 2.0
*/
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('taucharts'), require('d3-selection')) :
	typeof define === 'function' && define.amd ? define(['taucharts', 'd3-selection'], factory) :
	(global.Taucharts = global.Taucharts || {}, global.Taucharts.Tooltip = factory(global.Taucharts,global.d3));
}(this, (function (Taucharts,d3) { 'use strict';

Taucharts = Taucharts && Taucharts.hasOwnProperty('default') ? Taucharts['default'] : Taucharts;

var TOOLTIP_CLS$1 = 'tau-chart__tooltip';
function FieldsTemplate(tooltip, settings) {
    return {
        render: function (args) {
            this.args = args;
            args = Object.assign({}, args, {
                fields: this.filterFields(args.fields)
            });
            return this.rootTemplate(args);
        },
        rootTemplate: function (args) {
            return [
                "<div class=\"" + TOOLTIP_CLS$1 + "__buttons " + TOOLTIP_CLS$1 + "__clickable\">",
                this.buttonsTemplate(),
                "</div>",
                "<div class=\"i-role-content " + TOOLTIP_CLS$1 + "__content\">",
                this.contentTemplate(args),
                '</div>'
            ].join('\n');
        },
        contentTemplate: function (args) {
            return this.fieldsTemplate(args);
        },
        filterFields: function (fields) {
            return fields.filter(function (field) {
                var tokens = field.split('.');
                var matchX = ((tokens.length === 2) && tooltip.skipInfo[tokens[0]]);
                return !matchX;
            });
        },
        getLabel: function (field) {
            return tooltip.getFieldLabel(field);
        },
        getFormatter: function (field) {
            return tooltip.getFieldFormat(field);
        },
        fieldsTemplate: function (_a) {
            var _this = this;
            var data = _a.data, fields = _a.fields;
            return fields
                .map(function (field) {
                return _this.itemTemplate({ data: data, field: field });
            })
                .join('\n');
        },
        itemTemplate: function (_a) {
            var data = _a.data, field = _a.field;
            var label = this.getLabel(field);
            var value = this.getFormatter(field)(data[field]);
            return [
                "<div class=\"" + TOOLTIP_CLS$1 + "__list__item\">",
                "  <div class=\"" + TOOLTIP_CLS$1 + "__list__elem\">" + label + "</div>",
                "  <div class=\"" + TOOLTIP_CLS$1 + "__list__elem\">" + value + "</div>",
                '</div>'
            ].join('\n');
        },
        buttonsTemplate: function () {
            return [
                this.buttonTemplate({
                    cls: 'i-role-exclude',
                    text: 'Exclude',
                    icon: function () { return '<span class="tau-icon-close-gray"></span>'; }
                })
            ].join('\n');
        },
        buttonTemplate: function (_a) {
            var icon = _a.icon, text = _a.text, cls = _a.cls;
            return [
                "<div class=\"" + TOOLTIP_CLS$1 + "__button " + cls + "\">",
                "  <div class=\"" + TOOLTIP_CLS$1 + "__button__wrap\">",
                "    " + (icon ? icon() + " " : '') + text,
                '  </div>',
                '</div>'
            ].join('\n');
        },
        didMount: function () {
            var excludeBtn = tooltip.getDomNode().querySelector('.i-role-exclude');
            if (excludeBtn) {
                excludeBtn.addEventListener('click', function () {
                    tooltip.excludeHighlightedElement();
                    tooltip.setState({
                        highlight: null,
                        isStuck: false
                    });
                });
            }
        }
    };
}

var utils = Taucharts.api.utils;
var domUtils = Taucharts.api.domUtils;
var pluginsSDK = Taucharts.api.pluginsSDK;
var TOOLTIP_CLS = 'tau-chart__tooltip';
var Tooltip = /** @class */ (function () {
    function Tooltip(settings) {
        this.settings = utils.defaults(settings || {}, {
            align: 'bottom-right',
            clsClickable: TOOLTIP_CLS + "__clickable",
            clsStuck: 'stuck',
            clsTarget: TOOLTIP_CLS + "-target",
            escapeHtml: true,
            fields: null,
            formatters: {},
            getTemplate: null,
            spacing: 24,
            winBound: 12,
        });
        this.onRender = this._getRenderHandler();
    }
    Tooltip.prototype.init = function (chart) {
        this._chart = chart;
        this._tooltip = this._chart.addBalloon({
            spacing: this.settings.spacing,
            winBound: this.settings.winBound,
            auto: true,
            effectClass: 'fade'
        });
        this._initDomEvents();
        // Handle initial state
        this.state = {
            highlight: null,
            isStuck: false
        };
        this.setState(this.state);
        this._template = this._getTemplate();
    };
    Tooltip.prototype._getTemplate = function () {
        var defaultTemplate = FieldsTemplate(this, this.settings);
        if (typeof this.settings.getTemplate === 'function') {
            return this.settings.getTemplate(defaultTemplate, this, this.settings);
        }
        return defaultTemplate;
    };
    Tooltip.prototype._renderTemplate = function (data, fields) {
        return this._template.render({ data: data, fields: fields });
    };
    Tooltip.prototype._initDomEvents = function () {
        var _this = this;
        this._scrollHandler = function () {
            _this.setState({
                highlight: null,
                isStuck: false
            });
        };
        window.addEventListener('scroll', this._scrollHandler, true);
        this._outerClickHandler = function (e) {
            var clickableItems = Array.from(document
                .querySelectorAll("." + _this.settings.clsClickable))
                .concat(_this.getDomNode());
            var rects = clickableItems.map(function (el) { return el.getBoundingClientRect(); });
            var top = Math.min.apply(Math, rects.map(function (r) { return r.top; }));
            var left = Math.min.apply(Math, rects.map(function (r) { return r.left; }));
            var right = Math.max.apply(Math, rects.map(function (r) { return r.right; }));
            var bottom = Math.max.apply(Math, rects.map(function (r) { return r.bottom; }));
            if ((e.clientX < left) ||
                (e.clientX > right) ||
                (e.clientY < top) ||
                (e.clientY > bottom)) {
                _this.setState({
                    highlight: null,
                    isStuck: false
                });
            }
        };
    };
    Tooltip.prototype.getDomNode = function () {
        return this._tooltip.getElement();
    };
    Tooltip.prototype.setState = function (newState) {
        var _this = this;
        var settings = this.settings;
        var prev = this.state;
        var state = this.state = Object.assign({}, prev, newState);
        prev.highlight = prev.highlight || { data: null, cursor: null, unit: null };
        state.highlight = state.highlight || { data: null, cursor: null, unit: null };
        // If stuck, treat that data has not changed
        if (state.isStuck && prev.highlight.data) {
            state.highlight = prev.highlight;
        }
        // Show/hide tooltip
        if (state.highlight.data !== prev.highlight.data) {
            if (state.highlight.data) {
                this._hideTooltip();
                this._showTooltip(state.highlight.data, state.highlight.cursor);
                this._setTargetSvgClass(true);
                requestAnimationFrame(function () {
                    _this._setTargetSvgClass(true);
                });
            }
            else if (!state.isStuck && prev.highlight.data && !state.highlight.data) {
                this._removeFocus();
                this._hideTooltip();
                this._setTargetSvgClass(false);
            }
        }
        // Update tooltip position
        if (state.highlight.data && (!prev.highlight.cursor ||
            state.highlight.cursor.x !== prev.highlight.cursor.x ||
            state.highlight.cursor.y !== prev.highlight.cursor.y)) {
            this._tooltip.position(state.highlight.cursor.x, state.highlight.cursor.y);
            this._tooltip.updateSize();
        }
        // Stick/unstick tooltip
        var tooltipNode = this.getDomNode();
        if (state.isStuck !== prev.isStuck) {
            if (state.isStuck) {
                window.addEventListener('click', this._outerClickHandler, true);
                tooltipNode.classList.add(settings.clsStuck);
                this._setTargetEventsEnabled(false);
                this._accentFocus(state.highlight.data);
                this._tooltip.updateSize();
            }
            else {
                window.removeEventListener('click', this._outerClickHandler, true);
                tooltipNode.classList.remove(settings.clsStuck);
                // NOTE: Prevent showing tooltip immediately
                // after pointer events appear.
                requestAnimationFrame(function () {
                    _this._setTargetEventsEnabled(true);
                    // Dispatch `mouseleave` (should cause `data-hover` with empty data
                    // and should dispatch leaving focus for some plugins like Crosshair)
                    var svg = _this._chart.getSVG();
                    if (svg) {
                        domUtils.dispatchMouseEvent(svg, 'mouseleave');
                    }
                });
            }
        }
    };
    Tooltip.prototype._showTooltip = function (data, cursor) {
        var settings = this.settings;
        var fields = (settings.fields
            ||
                ((typeof settings.getFields === 'function') && settings.getFields(this._chart))
            ||
                Object.keys(data));
        var content = this._renderTemplate(data, fields);
        this._tooltip
            .content(content)
            .position(cursor.x, cursor.y)
            .place(settings.align)
            .show()
            .updateSize();
        if (this._template.didMount) {
            this._template.didMount();
        }
    };
    Tooltip.prototype._hideTooltip = function () {
        window.removeEventListener('click', this._outerClickHandler, true);
        if (this._template.willUnmount) {
            this._template.willUnmount();
        }
        this._tooltip.hide();
    };
    Tooltip.prototype.destroy = function () {
        window.removeEventListener('scroll', this._scrollHandler, true);
        this._setTargetSvgClass(false);
        this.setState({
            highlight: null,
            isStuck: false
        });
        this._tooltip.destroy();
    };
    Tooltip.prototype._subscribeToHover = function () {
        var _this = this;
        var elementsToMatch = [
            'ELEMENT.LINE',
            'ELEMENT.AREA',
            'ELEMENT.PATH',
            'ELEMENT.INTERVAL',
            'ELEMENT.INTERVAL.STACKED',
            'ELEMENT.POINT'
        ];
        this._chart
            .select(function (node) {
            return (elementsToMatch.indexOf(node.config.type) >= 0);
        })
            .forEach(function (node) {
            node.on('data-hover', function (sender, e) {
                var bodyRect = document.body.getBoundingClientRect();
                _this.setState({
                    highlight: (e.data ? {
                        data: e.data,
                        cursor: {
                            x: (e.event.clientX - bodyRect.left),
                            y: (e.event.clientY - bodyRect.top)
                        },
                        unit: e.unit
                    } : null)
                });
            });
            node.on('data-click', function (sender, e) {
                var bodyRect = document.body.getBoundingClientRect();
                _this.setState(e.data ? {
                    highlight: {
                        data: e.data,
                        cursor: {
                            x: (e.event.clientX - bodyRect.left),
                            y: (e.event.clientY - bodyRect.top)
                        },
                        unit: e.unit
                    },
                    isStuck: true
                } : {
                    highlight: null,
                    isStuck: null
                });
            });
        });
    };
    Tooltip.prototype.getFieldFormat = function (k) {
        var format = (this._formatters[k] ?
            this._formatters[k].format :
            function (x) { return String(x); });
        return (this.settings.escapeHtml ?
            function (x) { return utils.escapeHtml(format(x)); } :
            format);
    };
    Tooltip.prototype.getFieldLabel = function (k) {
        var label = (this._formatters[k] ? this._formatters[k].label : k);
        return (this.settings.escapeHtml ? utils.escapeHtml(label) : label);
    };
    Tooltip.prototype._accentFocus = function (data) {
        var filter = (function (d) { return (d === data); });
        this._chart
            .select(function () { return true; })
            .forEach(function (unit) {
            unit.fire('highlight', filter);
        });
    };
    Tooltip.prototype._removeFocus = function () {
        var filter = (function () { return null; });
        this._chart
            .select(function () { return true; })
            .forEach(function (unit) {
            unit.fire('highlight', filter);
            unit.fire('highlight-data-points', filter);
        });
    };
    Tooltip.prototype.excludeHighlightedElement = function () {
        var highlightedRow = this.state.highlight.data;
        this._chart
            .addFilter({
            tag: 'exclude',
            predicate: function (row) {
                return (row !== highlightedRow);
            }
        });
        this._chart.refresh();
    };
    Tooltip.prototype._getRenderHandler = function () {
        return function () {
            this._formatters = pluginsSDK.getFieldFormatters(this._chart.getSpec(), this.settings.formatters);
            this._subscribeToHover();
            this.setState({
                highlight: null,
                isStuck: false
            });
        };
    };
    Tooltip.prototype._setTargetSvgClass = function (isSet) {
        d3.select(this._chart.getSVG()).classed(this.settings.clsTarget, isSet);
    };
    Tooltip.prototype._setTargetEventsEnabled = function (isSet) {
        if (isSet) {
            this._chart.enablePointerEvents();
        }
        else {
            this._chart.disablePointerEvents();
        }
    };
    return Tooltip;
}());

function TooltipPlugin(settings) {
    return new Tooltip(settings);
}
Taucharts.api.plugins.add('tooltip', TooltipPlugin);

return TooltipPlugin;

})));
