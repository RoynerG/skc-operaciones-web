(function () {
    'use strict';

    const config = window.SKCInventoryApp || {};
    const element = window.wp && window.wp.element;
    if (!element || !config.restUrl) {
        return;
    }

    const { createElement: h, Fragment, useEffect, useRef, useState } = element;
    const glossaryCache = new Map();

    const icons = {
        menu: [['line', { x1: 4, y1: 6, x2: 20, y2: 6 }], ['line', { x1: 4, y1: 12, x2: 20, y2: 12 }], ['line', { x1: 4, y1: 18, x2: 20, y2: 18 }]],
        mic: [['path', { d: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z' }], ['path', { d: 'M19 10v2a7 7 0 0 1-14 0v-2' }], ['line', { x1: 12, y1: 19, x2: 12, y2: 22 }]],
        save: [['path', { d: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z' }], ['polyline', { points: '17 21 17 13 7 13 7 21' }], ['polyline', { points: '7 3 7 8 15 8' }]],
        chevronLeft: [['polyline', { points: '15 18 9 12 15 6' }]],
        chevronRight: [['polyline', { points: '9 18 15 12 9 6' }]],
        plus: [['line', { x1: 12, y1: 5, x2: 12, y2: 19 }], ['line', { x1: 5, y1: 12, x2: 19, y2: 12 }]],
        trash: [['path', { d: 'M3 6h18' }], ['path', { d: 'M8 6V4h8v2' }], ['path', { d: 'M19 6l-1 14H6L5 6' }]],
        sparkles: [['path', { d: 'm12 3-1.9 4.8L5 10l5.1 2.2L12 17l1.9-4.8L19 10l-5.1-2.2L12 3Z' }]],
        check: [['polyline', { points: '20 6 9 17 4 12' }]],
        close: [['line', { x1: 18, y1: 6, x2: 6, y2: 18 }], ['line', { x1: 6, y1: 6, x2: 18, y2: 18 }]]
    };

    function Icon({ name, size = 20 }) {
        return h('svg', {
            width: size,
            height: size,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            'aria-hidden': 'true'
        }, (icons[name] || []).map((entry, index) => h(entry[0], { ...entry[1], key: index })));
    }

    async function api(path, options, timeoutMs = 35000) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(config.restUrl.replace(/\/$/, '') + path, {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + config.token
                },
                signal: controller.signal,
                ...options
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const error = new Error(data.message || 'No se pudo completar la solicitud.');
                error.status = response.status;
                error.data = data.details || data.data || {};
                throw error;
            }
            return data;
        } catch (error) {
            if (error && error.name === 'AbortError') {
                throw new Error('MiniMax tardó demasiado en responder. Intenta nuevamente con una descripción más corta.');
            }
            throw error;
        } finally {
            window.clearTimeout(timeout);
        }
    }

    function conditionMatches(condition, values) {
        const actual = values[condition.field];
        const expected = condition.default !== undefined ? condition.default : condition.value;
        const actualText = Array.isArray(actual) ? actual.join(',') : String(actual == null ? '' : actual);
        const expectedText = Array.isArray(expected) ? expected.join(',') : String(expected == null ? '' : expected);
        switch (condition.operator) {
            case 'not_equal': return actualText !== expectedText;
            case 'less': return Number(actualText) < Number(expectedText);
            case 'greater': return Number(actualText) > Number(expectedText);
            case 'contain': return actualText.includes(expectedText);
            case 'not_contain': return !actualText.includes(expectedText);
            case 'empty': return actualText === '';
            case 'not_empty': return actualText !== '';
            default: return actualText === expectedText;
        }
    }

    function isVisible(item, values) {
        return !(item.conditions || []).some(condition => !conditionMatches(condition, values));
    }

    const quantityRules = [
        {
            field: 'elige_la_cantidad_de_habitaciones',
            pattern: /(?:^|_)habitacion_(principal|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)(?:_|$)/
        },
        {
            field: 'cantidad_banos',
            pattern: /(?:^|_)bano_(principal|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)(?:_|$)/
        }
    ];
    const ordinalNumbers = {
        principal: 1,
        dos: 2,
        tres: 3,
        cuatro: 4,
        cinco: 5,
        seis: 6,
        siete: 7,
        ocho: 8,
        nueve: 9,
        diez: 10
    };

    function ruleIdentifier(item) {
        return [item.name, item.label]
            .filter(Boolean)
            .join('_')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    function quantityRule(item) {
        const identifier = ruleIdentifier(item);
        for (const rule of quantityRules) {
            const match = identifier.match(rule.pattern);
            if (match) {
                return { field: rule.field, position: ordinalNumbers[match[1]] };
            }
        }
        return null;
    }

    function isQuantityVisible(item, values) {
        const rule = quantityRule(item);
        if (!rule) return true;
        const selected = Math.max(0, Math.min(10, Number.parseInt(values[rule.field], 10) || 0));
        return selected >= rule.position;
    }

    function shouldShowItem(item, values) {
        return isVisible(item, values) && isQuantityVisible(item, values);
    }

    function valuesForSubmission(schema, values) {
        const next = { ...values };
        (schema.sections || []).forEach(section => {
            (section.items || []).forEach(item => {
                if (!item.name || !quantityRule(item) || isQuantityVisible(item, values)) return;
                next[item.name] = item.kind === 'repeater' ? [] : '';
            });
        });
        return next;
    }

    function isEmpty(value) {
        if (Array.isArray(value)) return value.length === 0;
        return value === undefined || value === null || String(value).trim() === '';
    }

    function isBlankRecord(value) {
        return !value || typeof value !== 'object' || Object.values(value).every(isEmpty);
    }

    function mergeAiValues(currentValues, suggestedValues, section) {
        const patch = {};
        let fields = 0;
        let rows = 0;
        const items = new Map((section.items || []).filter(item => item.name).map(item => [item.name, item]));

        Object.entries(suggestedValues || {}).forEach(([name, value]) => {
            const item = items.get(name);
            if (!item) return;
            if (item.kind !== 'repeater') {
                patch[name] = value;
                fields += 1;
                return;
            }

            const incoming = Array.isArray(value) ? value.filter(row => row && typeof row === 'object') : [];
            if (!incoming.length) return;
            const existing = Array.isArray(currentValues[name]) ? currentValues[name].map(row => ({ ...row })) : [];
            if (existing.length && isBlankRecord(existing[existing.length - 1])) {
                existing[existing.length - 1] = { ...existing[existing.length - 1], ...incoming.shift() };
                rows += 1;
            }
            rows += incoming.length;
            patch[name] = existing.concat(incoming);
        });

        return { patch, fields, rows };
    }

    function cleanLabel(value) {
        return String(value || '').replace(/[\u{1F300}-\u{1FAFF}\uFE0F]/gu, '').trim();
    }

    function startRecognition(onText, onState) {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Recognition) {
            onState('Tu navegador no permite dictado por voz.');
            return;
        }
        const recognition = new Recognition();
        recognition.lang = 'es-CO';
        recognition.interimResults = false;
        recognition.continuous = false;
        recognition.onstart = () => onState('Escuchando...');
        recognition.onerror = () => onState('No pude escuchar. Intenta de nuevo.');
        recognition.onend = () => onState('');
        recognition.onresult = event => {
            const text = Array.from(event.results).map(result => result[0].transcript).join(' ');
            onText(text);
        };
        recognition.start();
    }

    function useGlossary(field) {
        const [options, setOptions] = useState(field.options || []);
        useEffect(() => {
            if (options.length || !field.glossaryId) return;
            const id = field.glossaryId;
            if (glossaryCache.has(id)) {
                setOptions(glossaryCache.get(id));
                return;
            }
            api('/glossary/' + encodeURIComponent(id))
                .then(result => {
                    const loaded = Array.isArray(result.options) ? result.options : [];
                    glossaryCache.set(id, loaded);
                    setOptions(loaded);
                })
                .catch(() => setOptions([]));
        }, [field.glossaryId]);
        return options;
    }

    function aiGuideLabel(field) {
        const name = String(field.name || '');
        if (name.startsWith('descripcion_')) return 'Elemento';
        if (name.startsWith('estado_')) return 'Estado';
        if (name.startsWith('texto_cantidad_')) return 'Cantidad especial';
        if (name.startsWith('ninguna_')) return 'Disponibilidad';
        return cleanLabel(field.label || name);
    }

    function AiGuide({ section }) {
        const [optionGroups, setOptionGroups] = useState([]);
        useEffect(() => {
            let active = true;
            const fields = [];
            (section.items || []).forEach(item => {
                if (item.kind === 'field') fields.push(item);
                if (item.kind === 'repeater') fields.push(...(item.fields || []));
            });
            Promise.all(fields.map(async field => {
                let options = Array.isArray(field.options) ? field.options : [];
                if (!options.length && field.glossaryId) {
                    if (glossaryCache.has(field.glossaryId)) options = glossaryCache.get(field.glossaryId);
                    else {
                        const result = await api('/glossary/' + encodeURIComponent(field.glossaryId)).catch(() => ({ options: [] }));
                        options = Array.isArray(result.options) ? result.options : [];
                        glossaryCache.set(field.glossaryId, options);
                    }
                }
                return { label: aiGuideLabel(field), options };
            })).then(groups => {
                if (!active) return;
                const seen = new Set();
                setOptionGroups(groups.filter(group => {
                    if (!group.options.length) return false;
                    const key = group.label + ':' + group.options.map(option => option.value).join('|');
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                }));
            });
            return () => { active = false; };
        }, [section.id]);

        return h('div', { className: 'skc-ai-guide' },
            h('div', { className: 'skc-ai-template' },
                h('strong', null, 'Guía para dictar'),
                h('p', null, 'Di cada elemento así:'),
                h('code', null, 'Elemento, cantidad, material, estado y observaciones.'),
                h('small', null, 'Ejemplo: Cerradura, cantidad 1, material metal, estado regular, se atasca al cerrar.')
            ),
            optionGroups.length ? h('div', { className: 'skc-ai-options' },
                optionGroups.map(group => h('div', { key: group.label },
                    h('strong', null, group.label),
                    h('span', null, group.options.map(option => h('em', { key: option.value }, option.label || option.value)))
                ))
            ) : null
        );
    }

    function VoiceButton({ value, onChange, multiline = false }) {
        const [state, setState] = useState('');
        return h(Fragment, null,
            h('button', {
                type: 'button',
                className: 'skc-icon-button skc-field-mic',
                title: 'Dictar este campo',
                'aria-label': 'Dictar este campo',
                onClick: () => startRecognition(text => {
                    const separator = multiline && value ? ' ' : '';
                    onChange(String(value || '') + separator + text);
                }, setState)
            }, h(Icon, { name: 'mic', size: 18 })),
            state ? h('span', { className: 'skc-voice-state', role: 'status' }, state) : null
        );
    }

    function SelectInput({ field, value, onChange, id }) {
        const options = useGlossary(field);
        return h('select', {
            id,
            value: value == null ? '' : value,
            required: field.required,
            onChange: event => onChange(event.target.value)
        },
        h('option', { value: '' }, options.length ? 'Selecciona una opción' : 'Sin opciones disponibles'),
        options.map(option => h('option', { key: option.value, value: option.value }, option.label)));
    }

    function FieldInput({ field, value, onChange, error, compact = false }) {
        const id = 'skc-field-' + field.name + '-' + Math.random().toString(36).slice(2, 7);
        const type = field.type;
        const options = field.options || [];
        let control;

        if (type === 'select') {
            control = h(SelectInput, { field, value, onChange, id });
        } else if (type === 'textarea') {
            control = h('div', { className: 'skc-input-with-action' },
                h('textarea', {
                    id,
                    value: value == null ? '' : value,
                    rows: compact ? 2 : 3,
                    required: field.required,
                    onChange: event => onChange(event.target.value)
                }),
                h(VoiceButton, { value, onChange, multiline: true })
            );
        } else if (type === 'checkbox') {
            if (options.length > 1) {
                const selected = Array.isArray(value) ? value : [];
                control = h('div', { className: 'skc-choice-grid' }, options.map(option =>
                    h('label', { key: option.value, className: 'skc-choice' },
                        h('input', {
                            type: 'checkbox',
                            checked: selected.includes(option.value),
                            onChange: event => {
                                const next = event.target.checked
                                    ? selected.concat(option.value)
                                    : selected.filter(item => item !== option.value);
                                onChange(next);
                            }
                        }),
                        h('span', null, option.label)
                    )
                ));
            } else {
                const option = options[0] || { value: '1', label: field.label };
                control = h('label', { className: 'skc-choice skc-choice-single' },
                    h('input', {
                        id,
                        type: 'checkbox',
                        checked: value === true || value === option.value || value === '1',
                        onChange: event => onChange(event.target.checked ? option.value : '')
                    }),
                    h('span', null, option.label)
                );
            }
        } else if (type === 'radio') {
            control = h('div', { className: 'skc-choice-grid' }, options.map(option =>
                h('label', { key: option.value, className: 'skc-choice' },
                    h('input', {
                        type: 'radio',
                        name: field.name,
                        value: option.value,
                        checked: value === option.value,
                        onChange: () => onChange(option.value)
                    }),
                    h('span', null, option.label)
                )
            ));
        } else {
            const htmlType = type === 'number' || type === 'date' || type === 'time' ? type : 'text';
            let inputValue = value == null ? '' : value;
            if (htmlType === 'date' && /^\d{10}$/.test(String(inputValue))) {
                inputValue = new Date(Number(inputValue) * 1000).toISOString().slice(0, 10);
            }
            control = h('div', { className: 'skc-input-with-action' },
                h('input', {
                    id,
                    type: htmlType,
                    value: inputValue,
                    required: field.required,
                    min: field.min,
                    max: field.max,
                    step: field.step,
                    inputMode: htmlType === 'number' ? 'decimal' : undefined,
                    onChange: event => onChange(event.target.value)
                }),
                htmlType === 'text' ? h(VoiceButton, { value, onChange }) : null
            );
        }

        return h('div', {
            className: 'skc-field' + (error ? ' has-error' : '') + (compact ? ' is-compact' : ''),
            'data-field': field.name
        },
        type !== 'checkbox' || options.length > 1
            ? h('label', { htmlFor: id }, field.label || field.name, field.required ? h('span', { className: 'skc-required' }, ' *') : null)
            : null,
        control,
        error ? h('span', { className: 'skc-field-error', role: 'alert' }, error) : null,
        field.description && !compact ? h('small', null, field.description) : null);
    }

    function Repeater({ item, rows, onChange, values, errors }) {
        const currentRows = Array.isArray(rows) ? rows : [];
        const addRow = () => {
            const row = {};
            (item.fields || []).forEach(field => {
                row[field.name] = field.defaultValue || '';
            });
            onChange(currentRows.concat(row));
        };

        return h('section', { className: 'skc-repeater', 'data-repeater': item.name },
            h('div', { className: 'skc-repeater-heading' },
                h('div', null,
                    h('h3', null, item.label),
                    h('span', null, currentRows.length + (currentRows.length === 1 ? ' elemento' : ' elementos'))
                ),
                h('button', { type: 'button', className: 'skc-button skc-button-secondary', onClick: addRow },
                    h(Icon, { name: 'plus', size: 18 }), item.addLabel || 'Agregar'
                )
            ),
            currentRows.length === 0
                ? h('div', { className: 'skc-empty-repeater' }, 'Todavía no hay elementos en esta sección.')
                : currentRows.map((row, rowIndex) =>
                    h('div', { className: 'skc-repeater-row', key: rowIndex },
                        h('div', { className: 'skc-repeater-row-title' },
                            h('strong', null, (() => {
                                const descriptionField = (item.fields || []).find(field => String(field.name || '').startsWith('descripcion_'));
                                const description = descriptionField ? row[descriptionField.name] : '';
                                return description || 'Elemento ' + (rowIndex + 1);
                            })()),
                            h('button', {
                                type: 'button',
                                className: 'skc-icon-button skc-remove-row',
                                title: 'Eliminar elemento',
                                'aria-label': 'Eliminar elemento ' + (rowIndex + 1),
                                onClick: () => onChange(currentRows.filter((unused, index) => index !== rowIndex))
                            }, h(Icon, { name: 'trash', size: 18 }))
                        ),
                        h('div', { className: 'skc-fields-grid skc-repeater-fields' },
                            (item.fields || []).filter(field => isVisible(field, { ...values, ...row })).map(field =>
                                h(FieldInput, {
                                    key: field.name,
                                    field,
                                    compact: true,
                                    value: row[field.name],
                                    error: errors[item.name + '.' + rowIndex + '.' + field.name],
                                    onChange: nextValue => {
                                        const nextRows = currentRows.slice();
                                        nextRows[rowIndex] = { ...row, [field.name]: nextValue };
                                        onChange(nextRows);
                                    }
                                })
                            )
                        )
                    )
                )
        );
    }

    function App({ mode }) {
        const [loading, setLoading] = useState(true);
        const [schema, setSchema] = useState(null);
        const [values, setValues] = useState({});
        const [sectionIndex, setSectionIndex] = useState(0);
        const [status, setStatus] = useState({ kind: 'idle', text: 'Preparando autoguardado...' });
        const [errors, setErrors] = useState({});
        const [navOpen, setNavOpen] = useState(false);
        const [aiOpen, setAiOpen] = useState(false);
        const [aiText, setAiText] = useState('');
        const [aiBusy, setAiBusy] = useState(false);
        const [aiResult, setAiResult] = useState(null);
        const [aiUndo, setAiUndo] = useState(null);
        const [submitting, setSubmitting] = useState(false);
        const valuesRef = useRef({});
        const dirtyRef = useRef({});
        const revisionRef = useRef(0);
        const draftKeyRef = useRef('');
        const localTimerRef = useRef(null);
        const saveTimerRef = useRef(null);
        const contextRef = useRef(config.context || {});

        useEffect(() => {
            const query = '?mode=' + encodeURIComponent(mode) + '&context=' + encodeURIComponent(JSON.stringify(contextRef.current));
            api('/bootstrap' + query)
                .then(result => {
                    const localKey = 'skc-inventory-app:' + result.draftKey;
                    let nextValues = result.values || {};
                    try {
                        const local = JSON.parse(localStorage.getItem(localKey) || 'null');
                        const serverTime = result.draftUpdatedAt ? Date.parse(result.draftUpdatedAt.replace(' ', 'T')) : 0;
                        if (local && local.values && Number(local.savedAt || 0) > serverTime) {
                            nextValues = { ...nextValues, ...local.values };
                            dirtyRef.current = { ...local.values };
                            setStatus({ kind: 'pending', text: 'Recuperado del dispositivo. Falta sincronizar.' });
                        }
                    } catch (error) {}
                    draftKeyRef.current = result.draftKey;
                    revisionRef.current = Number(result.revision || 0);
                    valuesRef.current = nextValues;
                    setValues(nextValues);
                    setSchema(result.schema);
                    setLoading(false);
                })
                .catch(error => {
                    setStatus({ kind: 'error', text: error.message });
                    setLoading(false);
                });
        }, [mode]);

        useEffect(() => {
            if (!schema) return undefined;
            const interval = window.setInterval(() => {
                if (Object.keys(dirtyRef.current).length) saveDraft();
            }, 30000);
            return () => window.clearInterval(interval);
        }, [schema]);

        useEffect(() => {
            const beforeUnload = event => {
                if (!Object.keys(dirtyRef.current).length) return;
                event.preventDefault();
                event.returnValue = 'Hay cambios que todavía no se han sincronizado.';
            };
            window.addEventListener('beforeunload', beforeUnload);
            return () => window.removeEventListener('beforeunload', beforeUnload);
        }, []);

        const sections = schema ? schema.sections || [] : [];
        const currentSection = sections[sectionIndex] || null;

        function updateValues(patch, message = 'Cambios pendientes...') {
            const next = { ...valuesRef.current, ...patch };
            valuesRef.current = next;
            Object.entries(patch).forEach(([name, value]) => {
                dirtyRef.current[name] = value;
            });
            setValues(next);
            setStatus({ kind: 'pending', text: message });

            window.clearTimeout(localTimerRef.current);
            localTimerRef.current = window.setTimeout(() => {
                if (!draftKeyRef.current) return;
                localStorage.setItem('skc-inventory-app:' + draftKeyRef.current, JSON.stringify({
                    values: valuesRef.current,
                    savedAt: Date.now()
                }));
            }, 400);

            window.clearTimeout(saveTimerRef.current);
            saveTimerRef.current = window.setTimeout(saveDraft, 10000);
        }

        function updateValue(name, value) {
            updateValues({ [name]: value });
        }

        async function saveDraft() {
            const patch = { ...dirtyRef.current };
            if (!Object.keys(patch).length || !draftKeyRef.current) return;
            setStatus({ kind: 'saving', text: 'Guardando...' });
            try {
                const result = await api('/draft', {
                    method: 'POST',
                    body: JSON.stringify({
                        mode,
                        context: contextRef.current,
                        draftKey: draftKeyRef.current,
                        revision: revisionRef.current,
                        patch
                    })
                });
                Object.keys(patch).forEach(name => {
                    if (dirtyRef.current[name] === patch[name]) delete dirtyRef.current[name];
                });
                revisionRef.current = Number(result.revision || revisionRef.current);
                setStatus({ kind: 'saved', text: 'Guardado ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
            } catch (error) {
                setStatus({
                    kind: 'error',
                    text: error.status === 409 ? 'Hay otro borrador más reciente. Recarga antes de continuar.' : error.message
                });
            }
        }

        function validateSection(section) {
            const found = {};
            (section.items || []).forEach(item => {
                if (!shouldShowItem(item, valuesRef.current)) return;
                if (item.kind === 'field' && item.required && isEmpty(valuesRef.current[item.name])) {
                    found[item.name] = 'Este campo es obligatorio.';
                }
                if (item.kind === 'repeater') {
                    const rows = Array.isArray(valuesRef.current[item.name]) ? valuesRef.current[item.name] : [];
                    rows.forEach((row, rowIndex) => {
                        (item.fields || []).forEach(field => {
                            if (field.required && isVisible(field, { ...valuesRef.current, ...row }) && isEmpty(row[field.name])) {
                                found[item.name + '.' + rowIndex + '.' + field.name] = 'Campo obligatorio.';
                            }
                        });
                    });
                }
            });
            setErrors(found);
            const first = Object.keys(found)[0];
            if (first) {
                window.setTimeout(() => {
                    const element = document.querySelector('[data-field="' + CSS.escape(first.split('.').pop()) + '"]');
                    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 30);
            }
            return !first;
        }

        function goNext() {
            if (!currentSection || !validateSection(currentSection)) return;
            setErrors({});
            setSectionIndex(index => Math.min(index + 1, sections.length - 1));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        async function submit() {
            for (let index = 0; index < sections.length; index++) {
                if (!validateSection(sections[index])) {
                    setSectionIndex(index);
                    setStatus({ kind: 'error', text: 'Revisa los campos obligatorios de esta sección.' });
                    return;
                }
            }
            setSubmitting(true);
            setStatus({ kind: 'saving', text: 'Guardando inventario final...' });
            try {
                const submittedValues = valuesForSubmission(schema, valuesRef.current);
                const result = await api('/submit', {
                    method: 'POST',
                    body: JSON.stringify({ mode, context: contextRef.current, values: submittedValues })
                });
                dirtyRef.current = {};
                localStorage.removeItem('skc-inventory-app:' + draftKeyRef.current);
                setStatus({ kind: 'saved', text: result.message || 'Inventario guardado.' });
                window.setTimeout(() => {
                    const target = new URL(config.redirectUrl, window.location.origin);
                    if (result.inventoryId) target.searchParams.set('id_inventario', result.inventoryId);
                    window.location.assign(target.toString());
                }, 900);
            } catch (error) {
                setStatus({ kind: 'error', text: error.message });
                setSubmitting(false);
            }
        }

        async function askAi(dictatedText) {
            const transcript = typeof dictatedText === 'string' ? dictatedText.trim() : aiText.trim();
            if (!transcript || !currentSection || aiBusy) return;
            setAiBusy(true);
            setAiResult(null);
            setStatus({ kind: 'saving', text: 'MiniMax está organizando la descripción...' });
            try {
                const result = await api('/ai/fill', {
                    method: 'POST',
                    body: JSON.stringify({ mode, sectionId: currentSection.id, transcript })
                }, 90000);
                const merged = mergeAiValues(valuesRef.current, result.values || {}, currentSection);
                if (!Object.keys(merged.patch).length) throw new Error('La IA no encontró campos aplicables en esta sección.');
                const previous = {};
                Object.keys(merged.patch).forEach(name => {
                    const item = (currentSection.items || []).find(candidate => candidate.name === name);
                    previous[name] = valuesRef.current[name] ?? (item && item.kind === 'repeater' ? [] : '');
                });
                setAiUndo(previous);
                updateValues(merged.patch, 'IA aplicada. Revisa los datos resaltados en esta sección.');
                setAiText('');
                setAiResult({ fields: merged.fields, rows: merged.rows });
                window.setTimeout(() => {
                    const targetName = Object.keys(merged.patch)[0];
                    const target = document.querySelector('[data-repeater="' + CSS.escape(targetName) + '"], [data-field="' + CSS.escape(targetName) + '"]');
                    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 80);
            } catch (error) {
                setAiResult({ error: error.message });
                setStatus({ kind: 'error', text: error.message });
            } finally {
                setAiBusy(false);
            }
        }

        function undoAi() {
            if (!aiUndo) return;
            updateValues(aiUndo, 'Cambios de la IA deshechos.');
            setAiUndo(null);
            setAiResult(null);
        }

        if (loading) {
            return h('div', { className: 'skc-app-loading', role: 'status' }, h('span', { className: 'skc-spinner' }), 'Cargando inventario...');
        }
        if (!schema || !currentSection) {
            return h('div', { className: 'skc-app-fatal' }, status.text || 'No se pudo cargar el formulario.');
        }

        return h('div', { className: 'skc-app-shell' },
            h('header', { className: 'skc-app-header' },
                h('div', { className: 'skc-app-header-main' },
                    h('button', {
                        type: 'button',
                        className: 'skc-icon-button skc-menu-button',
                        'aria-label': 'Mostrar secciones',
                        'aria-expanded': navOpen,
                        onClick: () => setNavOpen(!navOpen)
                    }, h(Icon, { name: 'menu' })),
                    h('div', { className: 'skc-app-title' },
                        config.branding && config.branding.logoUrl ? h('span', { className: 'skc-header-logo' },
                            h('img', { src: config.branding.logoUrl, alt: config.branding.organizationName || 'SKC' })
                        ) : null,
                        h('span', { className: 'skc-app-title-copy' },
                            h('strong', null, schema.title),
                            h('span', null, 'Sección ' + (sectionIndex + 1) + ' de ' + sections.length)
                        )
                    ),
                    h('div', { className: 'skc-save-status is-' + status.kind, role: 'status' },
                        status.kind === 'saving' ? h('span', { className: 'skc-spinner is-small' }) : null,
                        status.kind === 'saved' ? h(Icon, { name: 'check', size: 16 }) : null,
                        h('span', null, status.text)
                    ),
                    h('button', {
                        type: 'button',
                        className: 'skc-icon-button skc-header-exit',
                        title: 'Volver a inventarios',
                        'aria-label': 'Volver a inventarios',
                        onClick: () => window.location.assign(config.exitUrl || '/modules/inventory')
                    }, h(Icon, { name: 'close' })),
                    h('button', {
                        type: 'button',
                        className: 'skc-icon-button skc-header-save',
                        title: 'Guardar ahora',
                        'aria-label': 'Guardar ahora',
                        onClick: saveDraft
                    }, h(Icon, { name: 'save' }))
                ),
                h('div', { className: 'skc-progress', 'aria-label': Math.round(((sectionIndex + 1) / sections.length) * 100) + '% completado' },
                    h('span', { style: { width: ((sectionIndex + 1) / sections.length) * 100 + '%' } })
                )
            ),
            h('div', { className: 'skc-app-layout' },
                h('aside', { className: 'skc-section-nav' + (navOpen ? ' is-open' : '') },
                    h('div', { className: 'skc-nav-mobile-title' },
                        h('strong', null, 'Secciones'),
                        h('button', { type: 'button', className: 'skc-icon-button', 'aria-label': 'Cerrar secciones', onClick: () => setNavOpen(false) }, h(Icon, { name: 'close' }))
                    ),
                    sections.map((section, index) => h('button', {
                        type: 'button',
                        key: section.id,
                        className: index === sectionIndex ? 'is-active' : '',
                        onClick: () => {
                            setSectionIndex(index);
                            setNavOpen(false);
                            setErrors({});
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    }, h('span', null, index + 1), h('em', null, cleanLabel(section.title))))
                ),
                navOpen ? h('button', { type: 'button', className: 'skc-nav-scrim', 'aria-label': 'Cerrar navegación', onClick: () => setNavOpen(false) }) : null,
                h('main', { className: 'skc-form-main' },
                    h('div', { className: 'skc-section-heading' },
                        h('div', null,
                            h('span', null, 'Sección ' + (sectionIndex + 1)),
                            h('h1', null, cleanLabel(currentSection.title))
                        )
                    ),
                    h('div', { className: 'skc-section-content' },
                        h('div', { className: 'skc-fields-grid' },
                            (currentSection.items || []).filter(item => shouldShowItem(item, values)).map((item, itemIndex) => {
                                if (item.kind === 'heading') {
                                    return item.label === currentSection.title
                                        ? null
                                        : h('div', { className: 'skc-group-heading', key: 'heading-' + itemIndex },
                                            h('h2', null, item.label),
                                            item.description ? h('p', null, item.description) : null
                                        );
                                }
                                if (item.kind === 'field') {
                                    if (item.type === 'hidden') return null;
                                    return h(FieldInput, {
                                        key: item.name,
                                        field: item,
                                        value: values[item.name],
                                        error: errors[item.name],
                                        onChange: value => updateValue(item.name, value)
                                    });
                                }
                                if (item.kind === 'repeater') {
                                    return h(Repeater, {
                                        key: item.name,
                                        item,
                                        values,
                                        rows: values[item.name],
                                        errors,
                                        onChange: rows => updateValue(item.name, rows)
                                    });
                                }
                                return null;
                            })
                        )
                    ),
                    config.aiEnabled ? h('section', { className: 'skc-ai-workspace' },
                        h('div', { className: 'skc-ai-dock' },
                            h('div', null,
                                h('strong', null, 'Completa más elementos con IA'),
                                h('span', null, 'Dicta uno o varios elementos sin volver al inicio de la sección.')
                            ),
                            h('button', {
                                type: 'button',
                                className: 'skc-button skc-ai-button',
                                onClick: () => setAiOpen(!aiOpen),
                                'aria-expanded': aiOpen
                            }, h(Icon, { name: 'sparkles', size: 18 }), aiOpen ? 'Cerrar ayuda con IA' : 'Ayuda con IA')
                        ),
                        aiOpen ? h('section', { className: 'skc-ai-panel' },
                            h('div', { className: 'skc-ai-heading' },
                                h('span', null, h(Icon, { name: 'sparkles', size: 20 })),
                                h('div', null,
                                    h('strong', null, 'Captura inteligente'),
                                    h('p', null, 'La IA conoce los campos y las opciones disponibles de este repetidor.')
                                )
                            ),
                            h(AiGuide, { section: currentSection }),
                            h('label', { htmlFor: 'skc-ai-text' }, 'Describe lo que observas'),
                            h('div', { className: 'skc-ai-input' },
                                h('textarea', {
                                    id: 'skc-ai-text',
                                    rows: 3,
                                    value: aiText,
                                    onChange: event => setAiText(event.target.value),
                                    placeholder: 'Ejemplo: Puerta, cantidad 1, material madera, estado bueno, funciona correctamente.'
                                }),
                                h('button', {
                                    type: 'button',
                                    className: 'skc-icon-button',
                                    title: 'Dictar descripción',
                                    'aria-label': 'Dictar descripción',
                                    disabled: aiBusy,
                                    onClick: () => startRecognition(text => {
                                        setAiText(text);
                                        askAi(text);
                                    }, text => {
                                        if (text) setStatus({ kind: 'idle', text });
                                    })
                                }, h(Icon, { name: 'mic' }))
                            ),
                            aiResult ? h('div', { className: 'skc-ai-review' + (aiResult.error ? ' is-error' : ''), role: 'status', 'aria-live': 'polite' },
                                h('strong', null, aiResult.error ? 'No pude completar los campos' : 'Campos completados en el formulario'),
                                h('p', null, aiResult.error || ((aiResult.rows ? aiResult.rows + (aiResult.rows === 1 ? ' elemento agregado' : ' elementos agregados') : aiResult.fields + ' campos actualizados') + '. Revísalos antes de continuar.')),
                                h('div', { className: 'skc-inline-actions' },
                                    aiUndo && !aiResult.error ? h('button', { type: 'button', className: 'skc-button skc-button-quiet', onClick: undoAi }, 'Deshacer cambios') : null,
                                    h('button', { type: 'button', className: 'skc-button skc-button-secondary', onClick: () => setAiResult(null) }, 'Cerrar aviso')
                                )
                            ) : null,
                            h('button', {
                                type: 'button',
                                className: 'skc-button skc-button-primary',
                                disabled: !aiText.trim() || aiBusy,
                                onClick: () => askAi()
                            }, aiBusy ? h('span', { className: 'skc-spinner is-small' }) : h(Icon, { name: 'sparkles', size: 18 }), aiBusy ? 'Completando campos…' : 'Completar campos ahora')
                        ) : null
                    ) : null,
                    h('footer', { className: 'skc-form-actions' },
                        h('button', {
                            type: 'button',
                            className: 'skc-button skc-button-secondary',
                            disabled: sectionIndex === 0,
                            onClick: () => {
                                setSectionIndex(index => Math.max(0, index - 1));
                                setErrors({});
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                        }, h(Icon, { name: 'chevronLeft', size: 18 }), 'Anterior'),
                        sectionIndex < sections.length - 1
                            ? h('button', { type: 'button', className: 'skc-button skc-button-primary', onClick: goNext },
                                'Siguiente', h(Icon, { name: 'chevronRight', size: 18 }))
                            : h('button', { type: 'button', className: 'skc-button skc-button-primary', disabled: submitting, onClick: submit },
                                submitting ? h('span', { className: 'skc-spinner is-small' }) : h(Icon, { name: 'check', size: 18 }),
                                mode === 'send' ? 'Enviar inventario' : 'Guardar inventario'
                            )
                    )
                )
            )
        );
    }

    document.querySelectorAll('.skc-inventory-app-root').forEach(root => {
        const mode = root.getAttribute('data-mode') || config.mode || 'add';
        if (element.createRoot) {
            root.__skcReactRoot = root.__skcReactRoot || element.createRoot(root);
            root.__skcReactRoot.render(h(App, { mode }));
        } else {
            element.render(h(App, { mode }), root);
        }
    });
})();
