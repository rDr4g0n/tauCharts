/*
taucharts@2.0.0-beta.35 (2018-01-11)
Copyright 2018 Targetprocess, Inc.
Licensed under Apache License 2.0
*/
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('taucharts'), require('d3-selection')) :
	typeof define === 'function' && define.amd ? define(['taucharts', 'd3-selection'], factory) :
	(global.Taucharts = global.Taucharts || {}, global.Taucharts.DiffTooltip = factory(global.Taucharts,global.d3));
}(this, (function (Taucharts,d3) { 'use strict';

Taucharts = Taucharts && Taucharts.hasOwnProperty('default') ? Taucharts['default'] : Taucharts;

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = Object.setPrototypeOf ||
    ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
    function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

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

var utils$1 = Taucharts.api.utils;
var domUtils = Taucharts.api.domUtils;
var pluginsSDK = Taucharts.api.pluginsSDK;
var TOOLTIP_CLS = 'tau-chart__tooltip';
var Tooltip = /** @class */ (function () {
    function Tooltip(settings) {
        this.settings = utils$1.defaults(settings || {}, {
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
            function (x) { return utils$1.escapeHtml(format(x)); } :
            format);
    };
    Tooltip.prototype.getFieldLabel = function (k) {
        var label = (this._formatters[k] ? this._formatters[k].label : k);
        return (this.settings.escapeHtml ? utils$1.escapeHtml(label) : label);
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

var DIFF_TOOLTIP_CLS = 'diff-tooltip';
var ROW_CLS = DIFF_TOOLTIP_CLS + "__item";
var HEADER_CLS = DIFF_TOOLTIP_CLS + "__header";
function DiffTemplate(tooltip, settings) {
    var base = FieldsTemplate(tooltip, settings);
    return Object.assign({}, base, {
        hasColor: function () {
            var colorField = this.args.colorField;
            return (colorField != null);
        },
        contentTemplate: function (args) {
            return [
                this.fieldsTemplate(args),
                this.tableTemplate(args)
            ].join('\n');
        },
        filterFields: function (fields) {
            var unit = tooltip.state.highlight.unit;
            var screenModel = unit.screenModel;
            var _a = screenModel.model, scaleColor = _a.scaleColor, scaleX = _a.scaleX, scaleY = _a.scaleY;
            var filtered = fields
                .filter(function (field) {
                return ((field !== scaleColor.dim) &&
                    (field !== scaleX.dim) &&
                    (field !== scaleY.dim));
            });
            var addX = function () { return filtered.push(scaleX.dim); };
            var addY = function () { return filtered.push(scaleY.dim); };
            var addColor = function () { return scaleColor.dim && filtered.push(scaleColor.dim); };
            if (this.shouldShowColorTable()) {
                addX();
            }
            else {
                addX();
                addColor();
                addY();
            }
            return base.filterFields.call(this, filtered);
        },
        itemTemplate: function (_a) {
            var data = _a.data, field = _a.field;
            var label = this.getLabel(field);
            var value = this.getFormatter(field)(data[field]);
            var prev = this.args.prev;
            var hasDiff = this.shouldShowDiff(field);
            var valueElement = [
                "<span class=\"" + ROW_CLS + "__value\">",
                "" + value,
                (hasDiff ? " " + this.fieldUpdownTemplate(this.getDiff({ data: data, prev: prev, field: field })) : ''),
                '</span>'
            ].join('');
            return [
                "<div class=\"" + TOOLTIP_CLS$1 + "__list__item\">",
                "  <div class=\"" + TOOLTIP_CLS$1 + "__list__elem\">" + label + "</div>",
                "  " + valueElement,
                '</div>'
            ].join('\n');
        },
        shouldShowDiff: function (field) {
            var valueField = this.args.valueField;
            return (field === valueField);
        },
        getDiff: function (_a) {
            var data = _a.data, prev = _a.prev, field = _a.field;
            var format = this.getFormatter(field);
            var v = (data ? data[field] : 0);
            var p = (prev ? prev[field] : 0);
            var dv = (v - p);
            var diff = format(dv);
            var sign = Math.sign(dv);
            return { diff: diff, sign: sign };
        },
        fieldUpdownTemplate: function (_a) {
            var diff = _a.diff, sign = _a.sign;
            var updownCls = DIFF_TOOLTIP_CLS + "__field__updown";
            var updownSignCls = updownCls + "_" + (sign > 0 ? 'positive' : 'negative');
            var updownSymbol = (sign > 0 ? '&#x25B2;' : sign < 0 ? '&#x25BC;' : '');
            var diffVal = (sign === 0 ? '' : diff);
            return [
                "<span class=\"" + updownCls + " " + updownSignCls + "\">",
                "" + updownSymbol + diffVal,
                '</span>'
            ].join('');
        },
        shouldShowColorTable: function () {
            var groups = this.args.groups;
            return (this.hasColor() && groups.length > 1);
        },
        tableTemplate: function (args) {
            if (!this.shouldShowColorTable()) {
                return '';
            }
            return [
                "<div class=\"" + DIFF_TOOLTIP_CLS + "__table\">",
                this.tableHeaderTemplate(args),
                this.tableBodyTemplate(args),
                '</div>'
            ].join('\n');
        },
        tableHeaderTemplate: function (_a) {
            var colorField = _a.colorField, valueField = _a.valueField;
            var groupLabel = this.getLabel(colorField);
            var valueLabel = this.getLabel(valueField);
            return [
                "<div class=\"" + HEADER_CLS + "\">",
                "  <span class=\"" + HEADER_CLS + "__text\">" + groupLabel + "</span>",
                "  <span class=\"" + HEADER_CLS + "__value\">" + valueLabel + "</span>",
                "  <span class=\"" + HEADER_CLS + "__updown\">&#x25BC;&#x25B2;</span>",
                '</div>'
            ].join('\n');
        },
        tableBodyTemplate: function (_a) {
            var _this = this;
            var data = _a.data, groups = _a.groups, valueField = _a.valueField, colorField = _a.colorField;
            var highlighted = data;
            var values = groups.map(function (_a) {
                var data = _a.data;
                return data ? data[valueField] : 0;
            });
            var min = Math.min.apply(Math, values);
            var max = Math.max.apply(Math, values);
            return [
                "<div class=\"" + DIFF_TOOLTIP_CLS + "__body\">",
                "<div class=\"" + DIFF_TOOLTIP_CLS + "__body__content\">",
                groups.map(function (_a) {
                    var data = _a.data, prev = _a.prev;
                    return _this.tableRowTemplate({ data: data, prev: prev, highlighted: highlighted, valueField: valueField, colorField: colorField, min: min, max: max });
                }).join('\n'),
                "</div>",
                "</div>"
            ].join('\n');
        },
        tableRowTemplate: function (_a) {
            var data = _a.data, prev = _a.prev, highlighted = _a.highlighted, valueField = _a.valueField, colorField = _a.colorField, min = _a.min, max = _a.max;
            var v = (data ? data[valueField] : 0);
            var name = this.getFormatter(colorField)((data || prev)[colorField]);
            var format = this.getFormatter(valueField);
            var value = format(v);
            var isHighlighted = (data === highlighted);
            var _b = this.getDiff({ data: data, prev: prev, field: valueField }), diff = _b.diff, sign = _b.sign;
            var _c = this.getColor(data || prev), color = _c.color, colorCls = _c.colorCls;
            return [
                "<div class=\"" + ROW_CLS + (isHighlighted ? " " + ROW_CLS + "_highlighted" : '') + "\">",
                "  " + this.valueBarTemplate({ min: min, max: max, v: v, color: color, colorCls: colorCls }),
                "  <span class=\"" + ROW_CLS + "__text\">" + name + "</span>",
                "  <span class=\"" + ROW_CLS + "__value\">" + value + "</span>",
                "  " + this.updownTemplate({ diff: diff, sign: sign }),
                '</div>'
            ].join('\n');
        },
        valueBarTemplate: function (_a) {
            var min = _a.min, max = _a.max, v = _a.v, color = _a.color, colorCls = _a.colorCls;
            min = Math.min(min, 0);
            max = Math.max(0, max);
            var range = (max - min);
            var left = (range === 0 ? 0 : ((v < 0 ? v - min : -min) / range));
            var width = (range === 0 ? 0 : ((v < 0 ? -v : v) / range));
            return [
                '<span',
                "    class=\"" + ROW_CLS + "__bg" + (colorCls ? " " + colorCls : '') + "\"",
                "    style=\"left: " + left * 100 + "%; width: " + width * 100 + "%; background-color: " + color + ";\"",
                "    ></span>",
            ].join('\n');
        },
        getColor: function (data) {
            var unit = tooltip.state.highlight.unit;
            var screenModel = unit.screenModel;
            return {
                color: screenModel.color(data),
                colorCls: screenModel.class(data)
            };
        },
        updownTemplate: function (_a) {
            var diff = _a.diff, sign = _a.sign;
            var updownCls = ROW_CLS + "__updown";
            var updownSignCls = updownCls + "_" + (sign > 0 ? 'positive' : 'negative');
            var updownSymbol = (sign > 0 ? '&#x25B2;' : sign < 0 ? '&#x25BC;' : '');
            var diffVal = (sign === 0 ? '' : diff);
            return [
                "<span class=\"" + updownCls + " " + updownSignCls + "\">",
                "" + updownSymbol + diffVal,
                '</span>'
            ].join('');
        },
        didMount: function () {
            base.didMount.call(this);
            this._scrollToHighlighted();
            this._reserveSpaceForUpdown();
        },
        _scrollToHighlighted: function () {
            var node = tooltip.getDomNode();
            var body = node.querySelector("." + DIFF_TOOLTIP_CLS + "__body");
            var content = node.querySelector("." + DIFF_TOOLTIP_CLS + "__body__content");
            var highlighted = node.querySelector("." + ROW_CLS + "_highlighted");
            if (!(body && content && highlighted)) {
                return;
            }
            var b = body.getBoundingClientRect();
            var c = content.getBoundingClientRect();
            var h = highlighted.getBoundingClientRect();
            var shift = 0;
            if (h.bottom > b.bottom) {
                var dy = ((h.bottom - b.bottom) + h.height);
                var limitDy = (c.bottom - b.bottom);
                shift = -Math.min(dy, limitDy);
                content.style.transform = "translateY(" + shift + "px)";
            }
            if (c.top + shift < b.top) {
                body.classList.add(DIFF_TOOLTIP_CLS + "__body_overflow-top");
            }
            if (c.bottom + shift > b.bottom) {
                body.classList.add(DIFF_TOOLTIP_CLS + "__body_overflow-bottom");
            }
        },
        _reserveSpaceForUpdown: function () {
            var node = tooltip.getDomNode();
            var body = node.querySelector("." + DIFF_TOOLTIP_CLS + "__body");
            var header = node.querySelector("." + HEADER_CLS);
            if (!(body && header)) {
                return;
            }
            // Todo: Use CSS table layout, no need in JS hack
            var updownSelector = "." + ROW_CLS + "__updown:not(:empty)";
            var updowns = Array.from(node.querySelectorAll(updownSelector));
            var widths = updowns.map(function (el) { return el.scrollWidth; });
            var maxWidth = Math.max.apply(Math, widths);
            var tooltipPad = 15;
            var pad = Math.max(0, Math.ceil(maxWidth - tooltipPad));
            body.style.paddingRight = pad + "px";
            header.style.paddingRight = pad + "px";
        }
    });
}

var utils$2 = Taucharts.api.utils;
var ELEMENT_HIGHLIGHT = 'ELEMENT.INTERVAL_HIGHLIGHT';
var IntervalHighlight = {
    draw: function () {
        var node = this.node();
        var config = node.config;
        this._container = config.options.slot(config.uid);
    },
    addInteraction: function () {
        var _this = this;
        var node = this.node();
        node.on('interval-highlight', function (sender, range) {
            _this._drawRange(range);
        });
    },
    _drawRange: function (range) {
        var node = this.node();
        var config = node.config;
        var flip = node.screenModel.flip;
        // Todo: Fix undefined container
        // const container = config.options.container; // undefined
        var container = this._container;
        var ROOT_CLS = 'interval-highlight';
        var GRADIENT_ID = ROOT_CLS + "__gradient";
        var start = (range ? range[0] : null);
        var end = (range ? range[1] : null);
        var size = (flip ? config.options.width : config.options.height);
        function defineGradient() {
            var DEFS_CLS = ROOT_CLS + "__defs";
            var START_CLS = ROOT_CLS + "__gradient-start";
            var END_CLS = ROOT_CLS + "__gradient-end";
            var svg = container.node();
            while ((svg = svg.parentNode).tagName !== 'svg')
                ;
            var id = DEFS_CLS + "__" + config.uid;
            var defs = d3.select(svg)
                .selectAll("#" + id)
                .data(range ? [1] : []);
            defs.exit().remove();
            var defsEnter = defs.enter()
                .append('defs')
                .attr('class', DEFS_CLS)
                .attr('id', id)
                .append('linearGradient')
                .attr('id', GRADIENT_ID)
                .attr('x1', '0%')
                .attr('y1', flip ? '100%' : '0%')
                .attr('x2', flip ? '0%' : '100%')
                .attr('y2', '0%');
            defsEnter
                .append('stop')
                .attr('class', START_CLS)
                .attr('offset', '0%');
            defsEnter
                .append('stop')
                .attr('class', END_CLS)
                .attr('offset', '100%');
        }
        function drawGroups() {
            var g = container
                .selectAll("." + ROOT_CLS)
                .data(range ? [1] : []);
            g.exit().remove();
            var gEnter = g
                .enter()
                .append('g')
                .attr('class', ROOT_CLS)
                .attr('pointer-events', 'none');
            return { g: g, gEnter: gEnter };
        }
        function drawRange(_a) {
            var g = _a.g, gEnter = _a.gEnter;
            var RANGE_CLS = ROOT_CLS + "__range";
            var rect = g.select("." + RANGE_CLS);
            var rectEnter = gEnter
                .append('rect')
                .attr('class', RANGE_CLS)
                .attr('fill', "url(#" + GRADIENT_ID + ")");
            var _b = (flip ?
                {
                    x: 0,
                    y: end,
                    width: size,
                    height: (start - end)
                } : {
                x: start,
                y: 0,
                width: (end - start),
                height: size
            }), x = _b.x, y = _b.y, width = _b.width, height = _b.height;
            rectEnter.merge(rect)
                .attr('x', x)
                .attr('y', y)
                .attr('width', width)
                .attr('height', height);
        }
        function drawStart(_a) {
            var g = _a.g, gEnter = _a.gEnter;
            var START_CLS = ROOT_CLS + "__range-start";
            var line = g.select("." + START_CLS);
            var lineEnter = gEnter
                .append('line')
                .attr('class', START_CLS);
            var _b = (flip ?
                {
                    x1: 0,
                    y1: start,
                    x2: size,
                    y2: start
                } : {
                x1: start,
                y1: 0,
                x2: start,
                y2: size
            }), x1 = _b.x1, y1 = _b.y1, x2 = _b.x2, y2 = _b.y2;
            lineEnter.merge(line)
                .attr('x1', x1)
                .attr('y1', y1)
                .attr('x2', x2)
                .attr('y2', y2);
        }
        function drawEnd(_a) {
            var g = _a.g, gEnter = _a.gEnter;
            var END_CLS = ROOT_CLS + "__range-end";
            var line = g.select("." + END_CLS);
            var lineEnter = gEnter
                .append('line')
                .attr('class', END_CLS);
            var _b = (flip ?
                {
                    x1: 0,
                    y1: end,
                    x2: size,
                    y2: end
                } : {
                x1: end,
                y1: 0,
                x2: end,
                y2: size
            }), x1 = _b.x1, y1 = _b.y1, x2 = _b.x2, y2 = _b.y2;
            lineEnter.merge(line)
                .attr('x1', x1)
                .attr('y1', y1)
                .attr('x2', x2)
                .attr('y2', y2);
        }
        utils$2.take(drawGroups())
            .next(function (binding) {
            defineGradient();
            drawRange(binding);
            drawStart(binding);
            drawEnd(binding);
        });
    }
};

var utils = Taucharts.api.utils;
var DiffTooltip = /** @class */ (function (_super) {
    __extends(DiffTooltip, _super);
    function DiffTooltip(settings) {
        var _this = _super.call(this, settings) || this;
        _this.onSpecReady = _this._getSpecReadyHandler();
        return _this;
    }
    DiffTooltip.prototype.init = function (chart) {
        _super.prototype.init.call(this, chart);
        this._unitsGroupedData = new Map();
    };
    DiffTooltip.prototype._getTemplate = function () {
        var defaultTemplate = DiffTemplate(this, this.settings);
        if (typeof this.settings.getTemplate === 'function') {
            return this.settings.getTemplate(defaultTemplate, this, this.settings);
        }
        return defaultTemplate;
    };
    DiffTooltip.prototype._renderTemplate = function (data, fields) {
        var unit = this.state.highlight.unit;
        var screenModel = unit.screenModel;
        var _a = screenModel.model, scaleColor = _a.scaleColor, scaleX = _a.scaleX, scaleY = _a.scaleY;
        var groupedData = this._unitsGroupedData.get(unit);
        var _b = this._getHighlightRange(data, unit), prevX = _b[0], x = _b[1];
        var getPrevItem = function (d) {
            var g = screenModel.model.color(d);
            var hasPrevItem = (isFinite(prevX) && groupedData[prevX][g]);
            // Note: If there are more than 1 items per X, the result is unpredictable.
            return (hasPrevItem ? groupedData[prevX][g][0] : null);
        };
        var prev = getPrevItem(data);
        // Note: Sort stacked elements by color, other by Y
        var shouldSortByColor = unit.config.stack;
        var sortByColor = (function () {
            var ci = scaleColor.domain().slice().reduce(function (map, c, i) {
                map[c] = i;
                return map;
            }, {});
            return (function (a, b) { return ci[a[scaleColor.dim]] - ci[b[scaleColor.dim]]; });
        })();
        var sortByY = (unit.config.flip ?
            (function (a, b) { return scaleY(b[scaleY.dim]) - scaleY(a[scaleY.dim]); }) :
            (function (a, b) { return scaleY(a[scaleY.dim]) - scaleY(b[scaleY.dim]); }));
        var getNeighbors = function (x) {
            return Object.keys(groupedData[x])
                .reduce(function (arr, g) { return arr.concat(groupedData[x][g]); }, [])
                .sort(shouldSortByColor ? sortByColor : sortByY);
        };
        var neighbors = getNeighbors(x);
        var groups = neighbors.map(function (data) {
            var g = screenModel.model.color(data);
            var prev = getPrevItem(data);
            return {
                data: data,
                prev: prev
            };
        });
        if (isFinite(prevX)) {
            // Note: Should also display data for missing group
            // if it is available for previous X
            var prevNeighbors = getNeighbors(prevX);
            var gs_1 = groups.reduce(function (map, g) {
                map[screenModel.model.color(g.data)] = true;
                return map;
            }, {});
            prevNeighbors.forEach(function (prev) {
                var g = screenModel.model.color(prev);
                if (!gs_1[g]) {
                    groups.push({
                        data: null,
                        prev: prev
                    });
                }
            });
            if (shouldSortByColor) {
                groups.sort(function (a, b) { return sortByColor(a.data || a.prev, b.data || b.prev); });
            }
        }
        return this._template.render({
            data: data,
            prev: prev,
            fields: fields,
            groups: groups,
            valueField: scaleY.dim,
            colorField: scaleColor.dim
        });
    };
    DiffTooltip.prototype._getRenderHandler = function () {
        var baseOnRender = _super.prototype._getRenderHandler.call(this);
        return function () {
            var _this = this;
            baseOnRender.call(this);
            var chart = this._chart;
            var units = chart.select(function (u) {
                return ((u.config.namespace === 'chart') &&
                    (u.config.type.indexOf('ELEMENT.') === 0) &&
                    (u.config.type !== ELEMENT_HIGHLIGHT));
            });
            var highlights = chart.select(function (u) { return u.config.type === ELEMENT_HIGHLIGHT; });
            var highlightsMap = highlights.reduce(function (map, h, i) {
                map[i] = h;
                return map;
            }, {});
            units.forEach(function (u, i) {
                var data = u.data();
                _this._unitsGroupedData.set(u, _this._getGroupedData(data, u));
                u.on('data-hover', function (sender, e) {
                    var highlight = highlightsMap[i];
                    var isTarget = (e.unit && e.unit === u);
                    var range = (isTarget ? _this._getHighlightRange(e.data, e.unit) : null);
                    highlight.fire('interval-highlight', range);
                });
            });
        };
    };
    DiffTooltip.prototype._getSpecReadyHandler = function () {
        return function (chart, specRef) {
            chart.traverseSpec(specRef, function (unit, parentUnit) {
                if (unit.type.indexOf('ELEMENT.') !== 0) {
                    return;
                }
                var over = JSON.parse(JSON.stringify(unit));
                over.type = ELEMENT_HIGHLIGHT;
                over.namespace = 'highlight';
                // Place highlight under element
                var index = parentUnit.units.indexOf(unit);
                parentUnit.units.splice(index, 0, over);
            });
        };
    };
    DiffTooltip.prototype._getGroupedData = function (data, unit) {
        var scaleX = unit.screenModel.model.scaleX;
        var groupByX = utils.groupBy(data, function (d) { return scaleX(d[scaleX.dim]).toString(); });
        var xPeriod = (unit.config.guide.x.tickPeriod || unit.config.guide.x.timeInterval);
        if (xPeriod) {
            var domain_1 = scaleX.domain();
            var utc = unit.config.guide.utcTime;
            var periods = Taucharts.api.tickPeriod
                .generate(domain_1[0], domain_1[1], xPeriod, { utc: utc })
                .filter(function (t) { return t >= domain_1[0] && t <= domain_1[1]; });
            periods.forEach(function (t) {
                var tx = scaleX(t);
                if (!groupByX[tx]) {
                    groupByX[tx] = [];
                }
            });
        }
        var groupByXAndGroup = Object.keys(groupByX).reduce(function (map, x) {
            map[x] = utils.groupBy(groupByX[x], function (d) { return unit.screenModel.model.color(d); });
            return map;
        }, {});
        return groupByXAndGroup;
    };
    DiffTooltip.prototype._getHighlightRange = function (data, unit) {
        var flip = unit.screenModel.flip;
        var scaleX = unit.screenModel.model.scaleX;
        var x = scaleX(data[scaleX.dim]);
        var groupedData = this._unitsGroupedData.get(unit);
        var asc = (function (a, b) { return a - b; });
        var desc = (function (a, b) { return b - a; });
        var allX = Object.keys(groupedData).map(Number).sort(flip ? desc : asc);
        var xIndex = allX.indexOf(x);
        if (xIndex === 0) {
            return [x, x];
        }
        var prevX = allX[xIndex - 1];
        return [prevX, x];
    };
    return DiffTooltip;
}(Tooltip));
function DiffTooltipPlugin(settings) {
    return new DiffTooltip(settings);
}
Taucharts.api.unitsRegistry.reg(ELEMENT_HIGHLIGHT, IntervalHighlight, 'ELEMENT.GENERIC.CARTESIAN');
Taucharts.api.plugins.add('diff-tooltip', DiffTooltipPlugin);

return DiffTooltipPlugin;

})));
