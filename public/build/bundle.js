
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function get_binding_group_value(group, __value, checked) {
        const value = new Set();
        for (let i = 0; i < group.length; i += 1) {
            if (group[i].checked)
                value.add(group[i].__value);
        }
        if (!checked) {
            value.delete(__value);
        }
        return Array.from(value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        select.selectedIndex = -1; // no option should be selected
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }
    class HtmlTag {
        constructor(is_svg = false) {
            this.is_svg = false;
            this.is_svg = is_svg;
            this.e = this.n = null;
        }
        c(html) {
            this.h(html);
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                if (this.is_svg)
                    this.e = svg_element(target.nodeName);
                else
                    this.e = element(target.nodeName);
                this.t = target;
                this.c(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Say.svelte generated by Svelte v3.48.0 */

    const file$3 = "src/Say.svelte";

    // (41:4) {:else}
    function create_else_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Oturum sonlandırıldı");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(41:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (39:4) {#if isLogin}
    function create_if_block$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Oturum açıldı");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(39:4) {#if isLogin}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let p0;
    	let strong;
    	let t0;
    	let t1;
    	let t2;
    	let div0;
    	let button0;
    	let t4;
    	let button1;
    	let t6;
    	let button2;
    	let hr0;
    	let t8;
    	let button3;
    	let t9;
    	let t10;
    	let p1;
    	let t11;
    	let p2;
    	let input0;
    	let t12;
    	let input1;
    	let t13;
    	let input2;
    	let t14;
    	let t15;
    	let span0;
    	let t16;
    	let t17;
    	let hr1;
    	let t18;
    	let p3;
    	let input3;
    	let t19;
    	let input4;
    	let t20;
    	let input5;
    	let t21;
    	let t22;
    	let span1;
    	let t23;
    	let t24;
    	let hr2;
    	let t25;
    	let p4;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let t30;
    	let span2;
    	let t31;
    	let t32;
    	let hr3;
    	let t33;
    	let h3;
    	let t35;
    	let div1;
    	let small;
    	let t37;
    	let input6;
    	let t38;
    	let input7;
    	let t39;
    	let p5;
    	let b0;
    	let t41;
    	let t42;
    	let t43;
    	let b1;
    	let t45;
    	let t46;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*isLogin*/ ctx[4]) return create_if_block$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			strong = element("strong");
    			t0 = text("Say: ");
    			t1 = text(/*count*/ ctx[3]);
    			t2 = space();
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "+";
    			t4 = space();
    			button1 = element("button");
    			button1.textContent = "-";
    			t6 = space();
    			button2 = element("button");
    			button2.textContent = "Reset";
    			hr0 = element("hr");
    			t8 = space();
    			button3 = element("button");
    			t9 = text(/*durum*/ ctx[5]);
    			t10 = space();
    			p1 = element("p");
    			if_block.c();
    			t11 = space();
    			p2 = element("p");
    			input0 = element("input");
    			t12 = text(" Kız\n    ");
    			input1 = element("input");
    			t13 = text(" Erkek\n    ");
    			input2 = element("input");
    			t14 = text(" Belirtmek istemiyorum");
    			t15 = space();
    			span0 = element("span");
    			t16 = text(/*cinsiyet*/ ctx[6]);
    			t17 = space();
    			hr1 = element("hr");
    			t18 = space();
    			p3 = element("p");
    			input3 = element("input");
    			t19 = text(" Vue\n    ");
    			input4 = element("input");
    			t20 = text(" React\n    ");
    			input5 = element("input");
    			t21 = text(" Svelte");
    			t22 = space();
    			span1 = element("span");
    			t23 = text(/*js_lib*/ ctx[7]);
    			t24 = space();
    			hr2 = element("hr");
    			t25 = space();
    			p4 = element("p");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Yaz";
    			option1 = element("option");
    			option1.textContent = "İlkbahar";
    			option2 = element("option");
    			option2.textContent = "Kış";
    			option3 = element("option");
    			option3.textContent = "Sonbahar";
    			t30 = space();
    			span2 = element("span");
    			t31 = text(/*mevsim_sec*/ ctx[8]);
    			t32 = space();
    			hr3 = element("hr");
    			t33 = space();
    			h3 = element("h3");
    			h3.textContent = "Reactivity";
    			t35 = space();
    			div1 = element("div");
    			small = element("small");
    			small.textContent = "Bir taraf değiştiğinde sonuç da değişir.";
    			t37 = space();
    			input6 = element("input");
    			t38 = space();
    			input7 = element("input");
    			t39 = space();
    			p5 = element("p");
    			b0 = element("b");
    			b0.textContent = "Çarpım:";
    			t41 = space();
    			t42 = text(/*carpim*/ ctx[9]);
    			t43 = text(" - ");
    			b1 = element("b");
    			b1.textContent = "Bölüm:";
    			t45 = space();
    			t46 = text(/*bolum*/ ctx[10]);
    			add_location(strong, file$3, 26, 4, 590);
    			set_style(p0, "color", /*renk*/ ctx[0]);
    			add_location(p0, file$3, 25, 0, 561);
    			add_location(button0, file$3, 31, 4, 637);
    			add_location(button1, file$3, 32, 4, 685);
    			add_location(button2, file$3, 33, 4, 733);
    			add_location(hr0, file$3, 33, 66, 795);
    			add_location(button3, file$3, 34, 4, 804);
    			add_location(div0, file$3, 30, 0, 627);
    			add_location(p1, file$3, 37, 0, 856);
    			attr_dev(input0, "type", "radio");
    			input0.__value = "Kız";
    			input0.value = input0.__value;
    			/*$$binding_groups*/ ctx[16][1].push(input0);
    			add_location(input0, file$3, 46, 4, 965);
    			attr_dev(input1, "type", "radio");
    			input1.__value = "Erkek";
    			input1.value = input1.__value;
    			/*$$binding_groups*/ ctx[16][1].push(input1);
    			add_location(input1, file$3, 47, 4, 1028);
    			attr_dev(input2, "type", "radio");
    			input2.__value = "Belirtmek istemiyorum";
    			input2.value = input2.__value;
    			/*$$binding_groups*/ ctx[16][1].push(input2);
    			add_location(input2, file$3, 48, 4, 1095);
    			add_location(p2, file$3, 45, 0, 957);
    			add_location(span0, file$3, 51, 0, 1196);
    			add_location(hr1, file$3, 52, 0, 1220);
    			attr_dev(input3, "type", "checkbox");
    			input3.__value = "Vue";
    			input3.value = input3.__value;
    			/*$$binding_groups*/ ctx[16][0].push(input3);
    			add_location(input3, file$3, 54, 4, 1233);
    			attr_dev(input4, "type", "checkbox");
    			input4.__value = "React";
    			input4.value = input4.__value;
    			/*$$binding_groups*/ ctx[16][0].push(input4);
    			add_location(input4, file$3, 55, 4, 1297);
    			attr_dev(input5, "type", "checkbox");
    			input5.__value = "Svelte";
    			input5.value = input5.__value;
    			/*$$binding_groups*/ ctx[16][0].push(input5);
    			add_location(input5, file$3, 56, 4, 1365);
    			add_location(p3, file$3, 53, 0, 1225);
    			add_location(span1, file$3, 58, 0, 1436);
    			add_location(hr2, file$3, 59, 0, 1458);
    			option0.__value = "Yaz";
    			option0.value = option0.__value;
    			add_location(option0, file$3, 62, 8, 1536);
    			option1.__value = "İlkbahar";
    			option1.value = option1.__value;
    			add_location(option1, file$3, 63, 8, 1577);
    			option2.__value = "Kış";
    			option2.value = option2.__value;
    			add_location(option2, file$3, 64, 8, 1628);
    			option3.__value = "Sonbahar";
    			option3.value = option3.__value;
    			add_location(option3, file$3, 65, 8, 1669);
    			attr_dev(select, "name", "aysec");
    			attr_dev(select, "id", "aysec");
    			if (/*mevsim_sec*/ ctx[8] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[22].call(select));
    			add_location(select, file$3, 61, 4, 1471);
    			add_location(p4, file$3, 60, 0, 1463);
    			add_location(span2, file$3, 68, 0, 1731);
    			add_location(hr3, file$3, 69, 0, 1757);
    			add_location(h3, file$3, 70, 0, 1762);
    			add_location(small, file$3, 72, 4, 1808);
    			attr_dev(div1, "id", "Reactivity");
    			attr_dev(div1, "class", "svelte-1csglal");
    			add_location(div1, file$3, 71, 0, 1782);
    			attr_dev(input6, "type", "number");
    			add_location(input6, file$3, 74, 1, 1872);
    			attr_dev(input7, "type", "number");
    			add_location(input7, file$3, 75, 4, 1924);
    			add_location(b0, file$3, 76, 7, 1979);
    			add_location(b1, file$3, 76, 33, 2005);
    			add_location(p5, file$3, 76, 4, 1976);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			append_dev(p0, strong);
    			append_dev(strong, t0);
    			append_dev(strong, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div0, anchor);
    			append_dev(div0, button0);
    			append_dev(div0, t4);
    			append_dev(div0, button1);
    			append_dev(div0, t6);
    			append_dev(div0, button2);
    			append_dev(div0, hr0);
    			append_dev(div0, t8);
    			append_dev(div0, button3);
    			append_dev(button3, t9);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, p1, anchor);
    			if_block.m(p1, null);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p2, anchor);
    			append_dev(p2, input0);
    			input0.checked = input0.__value === /*cinsiyet*/ ctx[6];
    			append_dev(p2, t12);
    			append_dev(p2, input1);
    			input1.checked = input1.__value === /*cinsiyet*/ ctx[6];
    			append_dev(p2, t13);
    			append_dev(p2, input2);
    			input2.checked = input2.__value === /*cinsiyet*/ ctx[6];
    			append_dev(p2, t14);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, span0, anchor);
    			append_dev(span0, t16);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, hr1, anchor);
    			insert_dev(target, t18, anchor);
    			insert_dev(target, p3, anchor);
    			append_dev(p3, input3);
    			input3.checked = ~/*js_lib*/ ctx[7].indexOf(input3.__value);
    			append_dev(p3, t19);
    			append_dev(p3, input4);
    			input4.checked = ~/*js_lib*/ ctx[7].indexOf(input4.__value);
    			append_dev(p3, t20);
    			append_dev(p3, input5);
    			input5.checked = ~/*js_lib*/ ctx[7].indexOf(input5.__value);
    			append_dev(p3, t21);
    			insert_dev(target, t22, anchor);
    			insert_dev(target, span1, anchor);
    			append_dev(span1, t23);
    			insert_dev(target, t24, anchor);
    			insert_dev(target, hr2, anchor);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, p4, anchor);
    			append_dev(p4, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(select, option3);
    			select_option(select, /*mevsim_sec*/ ctx[8]);
    			insert_dev(target, t30, anchor);
    			insert_dev(target, span2, anchor);
    			append_dev(span2, t31);
    			insert_dev(target, t32, anchor);
    			insert_dev(target, hr3, anchor);
    			insert_dev(target, t33, anchor);
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t35, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, small);
    			insert_dev(target, t37, anchor);
    			insert_dev(target, input6, anchor);
    			set_input_value(input6, /*reactivity_0*/ ctx[1]);
    			insert_dev(target, t38, anchor);
    			insert_dev(target, input7, anchor);
    			set_input_value(input7, /*reactivity_1*/ ctx[2]);
    			insert_dev(target, t39, anchor);
    			insert_dev(target, p5, anchor);
    			append_dev(p5, b0);
    			append_dev(p5, t41);
    			append_dev(p5, t42);
    			append_dev(p5, t43);
    			append_dev(p5, b1);
    			append_dev(p5, t45);
    			append_dev(p5, t46);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[12], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[13], false, false, false),
    					listen_dev(button2, "click", prevent_default(/*click_handler_2*/ ctx[14]), false, true, false),
    					listen_dev(button3, "click", /*loginol*/ ctx[11], false, false, false),
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[15]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[17]),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[18]),
    					listen_dev(input3, "change", /*input3_change_handler*/ ctx[19]),
    					listen_dev(input4, "change", /*input4_change_handler*/ ctx[20]),
    					listen_dev(input5, "change", /*input5_change_handler*/ ctx[21]),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[22]),
    					listen_dev(input6, "input", /*input6_input_handler*/ ctx[23]),
    					listen_dev(input7, "input", /*input7_input_handler*/ ctx[24])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*count*/ 8) set_data_dev(t1, /*count*/ ctx[3]);

    			if (dirty & /*renk*/ 1) {
    				set_style(p0, "color", /*renk*/ ctx[0]);
    			}

    			if (dirty & /*durum*/ 32) set_data_dev(t9, /*durum*/ ctx[5]);

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(p1, null);
    				}
    			}

    			if (dirty & /*cinsiyet*/ 64) {
    				input0.checked = input0.__value === /*cinsiyet*/ ctx[6];
    			}

    			if (dirty & /*cinsiyet*/ 64) {
    				input1.checked = input1.__value === /*cinsiyet*/ ctx[6];
    			}

    			if (dirty & /*cinsiyet*/ 64) {
    				input2.checked = input2.__value === /*cinsiyet*/ ctx[6];
    			}

    			if (dirty & /*cinsiyet*/ 64) set_data_dev(t16, /*cinsiyet*/ ctx[6]);

    			if (dirty & /*js_lib*/ 128) {
    				input3.checked = ~/*js_lib*/ ctx[7].indexOf(input3.__value);
    			}

    			if (dirty & /*js_lib*/ 128) {
    				input4.checked = ~/*js_lib*/ ctx[7].indexOf(input4.__value);
    			}

    			if (dirty & /*js_lib*/ 128) {
    				input5.checked = ~/*js_lib*/ ctx[7].indexOf(input5.__value);
    			}

    			if (dirty & /*js_lib*/ 128) set_data_dev(t23, /*js_lib*/ ctx[7]);

    			if (dirty & /*mevsim_sec*/ 256) {
    				select_option(select, /*mevsim_sec*/ ctx[8]);
    			}

    			if (dirty & /*mevsim_sec*/ 256) set_data_dev(t31, /*mevsim_sec*/ ctx[8]);

    			if (dirty & /*reactivity_0*/ 2 && to_number(input6.value) !== /*reactivity_0*/ ctx[1]) {
    				set_input_value(input6, /*reactivity_0*/ ctx[1]);
    			}

    			if (dirty & /*reactivity_1*/ 4 && to_number(input7.value) !== /*reactivity_1*/ ctx[2]) {
    				set_input_value(input7, /*reactivity_1*/ ctx[2]);
    			}

    			if (dirty & /*carpim*/ 512) set_data_dev(t42, /*carpim*/ ctx[9]);
    			if (dirty & /*bolum*/ 1024) set_data_dev(t46, /*bolum*/ ctx[10]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(p1);
    			if_block.d();
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(p2);
    			/*$$binding_groups*/ ctx[16][1].splice(/*$$binding_groups*/ ctx[16][1].indexOf(input0), 1);
    			/*$$binding_groups*/ ctx[16][1].splice(/*$$binding_groups*/ ctx[16][1].indexOf(input1), 1);
    			/*$$binding_groups*/ ctx[16][1].splice(/*$$binding_groups*/ ctx[16][1].indexOf(input2), 1);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(span0);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(hr1);
    			if (detaching) detach_dev(t18);
    			if (detaching) detach_dev(p3);
    			/*$$binding_groups*/ ctx[16][0].splice(/*$$binding_groups*/ ctx[16][0].indexOf(input3), 1);
    			/*$$binding_groups*/ ctx[16][0].splice(/*$$binding_groups*/ ctx[16][0].indexOf(input4), 1);
    			/*$$binding_groups*/ ctx[16][0].splice(/*$$binding_groups*/ ctx[16][0].indexOf(input5), 1);
    			if (detaching) detach_dev(t22);
    			if (detaching) detach_dev(span1);
    			if (detaching) detach_dev(t24);
    			if (detaching) detach_dev(hr2);
    			if (detaching) detach_dev(t25);
    			if (detaching) detach_dev(p4);
    			if (detaching) detach_dev(t30);
    			if (detaching) detach_dev(span2);
    			if (detaching) detach_dev(t32);
    			if (detaching) detach_dev(hr3);
    			if (detaching) detach_dev(t33);
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t35);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t37);
    			if (detaching) detach_dev(input6);
    			if (detaching) detach_dev(t38);
    			if (detaching) detach_dev(input7);
    			if (detaching) detach_dev(t39);
    			if (detaching) detach_dev(p5);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Say', slots, []);
    	let count = 0;
    	let { renk } = $$props;
    	let isLogin = false;
    	let durum = 'Login';

    	const loginol = () => {
    		if (isLogin) {
    			$$invalidate(5, durum = 'Login');
    			$$invalidate(4, isLogin = false);
    		} else {
    			$$invalidate(5, durum = 'Logout');
    			$$invalidate(4, isLogin = true);
    		}
    	};

    	let cinsiyet = "Kız";
    	let js_lib = ['React'];
    	let mevsim_sec;
    	let reactivity_0 = 0;
    	let reactivity_1 = 0;
    	let carpim = 0;
    	let bolum = 0;
    	const writable_props = ['renk'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Say> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[], []];
    	const click_handler = () => $$invalidate(3, count++, count);
    	const click_handler_1 = () => $$invalidate(3, count--, count);
    	const click_handler_2 = () => $$invalidate(3, count = 0);

    	function input0_change_handler() {
    		cinsiyet = this.__value;
    		$$invalidate(6, cinsiyet);
    	}

    	function input1_change_handler() {
    		cinsiyet = this.__value;
    		$$invalidate(6, cinsiyet);
    	}

    	function input2_change_handler() {
    		cinsiyet = this.__value;
    		$$invalidate(6, cinsiyet);
    	}

    	function input3_change_handler() {
    		js_lib = get_binding_group_value($$binding_groups[0], this.__value, this.checked);
    		$$invalidate(7, js_lib);
    	}

    	function input4_change_handler() {
    		js_lib = get_binding_group_value($$binding_groups[0], this.__value, this.checked);
    		$$invalidate(7, js_lib);
    	}

    	function input5_change_handler() {
    		js_lib = get_binding_group_value($$binding_groups[0], this.__value, this.checked);
    		$$invalidate(7, js_lib);
    	}

    	function select_change_handler() {
    		mevsim_sec = select_value(this);
    		$$invalidate(8, mevsim_sec);
    	}

    	function input6_input_handler() {
    		reactivity_0 = to_number(this.value);
    		$$invalidate(1, reactivity_0);
    	}

    	function input7_input_handler() {
    		reactivity_1 = to_number(this.value);
    		$$invalidate(2, reactivity_1);
    	}

    	$$self.$$set = $$props => {
    		if ('renk' in $$props) $$invalidate(0, renk = $$props.renk);
    	};

    	$$self.$capture_state = () => ({
    		count,
    		renk,
    		isLogin,
    		durum,
    		loginol,
    		cinsiyet,
    		js_lib,
    		mevsim_sec,
    		reactivity_0,
    		reactivity_1,
    		carpim,
    		bolum
    	});

    	$$self.$inject_state = $$props => {
    		if ('count' in $$props) $$invalidate(3, count = $$props.count);
    		if ('renk' in $$props) $$invalidate(0, renk = $$props.renk);
    		if ('isLogin' in $$props) $$invalidate(4, isLogin = $$props.isLogin);
    		if ('durum' in $$props) $$invalidate(5, durum = $$props.durum);
    		if ('cinsiyet' in $$props) $$invalidate(6, cinsiyet = $$props.cinsiyet);
    		if ('js_lib' in $$props) $$invalidate(7, js_lib = $$props.js_lib);
    		if ('mevsim_sec' in $$props) $$invalidate(8, mevsim_sec = $$props.mevsim_sec);
    		if ('reactivity_0' in $$props) $$invalidate(1, reactivity_0 = $$props.reactivity_0);
    		if ('reactivity_1' in $$props) $$invalidate(2, reactivity_1 = $$props.reactivity_1);
    		if ('carpim' in $$props) $$invalidate(9, carpim = $$props.carpim);
    		if ('bolum' in $$props) $$invalidate(10, bolum = $$props.bolum);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*reactivity_0, reactivity_1*/ 6) {
    			$$invalidate(9, carpim = reactivity_0 * reactivity_1);
    		}

    		if ($$self.$$.dirty & /*reactivity_1, reactivity_0*/ 6) {
    			$$invalidate(10, bolum = reactivity_1 === 0 || reactivity_0 === 0 && reactivity_1 === 0
    			? 0
    			: reactivity_0 / reactivity_1);
    		}
    	};

    	return [
    		renk,
    		reactivity_0,
    		reactivity_1,
    		count,
    		isLogin,
    		durum,
    		cinsiyet,
    		js_lib,
    		mevsim_sec,
    		carpim,
    		bolum,
    		loginol,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		input0_change_handler,
    		$$binding_groups,
    		input1_change_handler,
    		input2_change_handler,
    		input3_change_handler,
    		input4_change_handler,
    		input5_change_handler,
    		select_change_handler,
    		input6_input_handler,
    		input7_input_handler
    	];
    }

    class Say extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { renk: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Say",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*renk*/ ctx[0] === undefined && !('renk' in props)) {
    			console.warn("<Say> was created without expected prop 'renk'");
    		}
    	}

    	get renk() {
    		throw new Error("<Say>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set renk(value) {
    		throw new Error("<Say>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/MouseKonum.svelte generated by Svelte v3.48.0 */

    const file$2 = "src/MouseKonum.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let t0;
    	let t1_value = /*m*/ ctx[0].x + "";
    	let t1;
    	let t2;
    	let br;
    	let t3;
    	let t4_value = /*m*/ ctx[0].y + "";
    	let t4;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("x: ");
    			t1 = text(t1_value);
    			t2 = space();
    			br = element("br");
    			t3 = text("\n    y: ");
    			t4 = text(t4_value);
    			add_location(br, file$2, 11, 13, 181);
    			attr_dev(div, "class", "svelte-15zdge7");
    			add_location(div, file$2, 10, 0, 135);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    			append_dev(div, br);
    			append_dev(div, t3);
    			append_dev(div, t4);

    			if (!mounted) {
    				dispose = listen_dev(div, "mousemove", /*handleMouse*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*m*/ 1 && t1_value !== (t1_value = /*m*/ ctx[0].x + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*m*/ 1 && t4_value !== (t4_value = /*m*/ ctx[0].y + "")) set_data_dev(t4, t4_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('MouseKonum', slots, []);
    	let m = { x: 0, y: 0 };

    	const handleMouse = e => {
    		$$invalidate(0, m.x = e.clientX, m);
    		$$invalidate(0, m.y = e.clientY, m);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<MouseKonum> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ m, handleMouse });

    	$$self.$inject_state = $$props => {
    		if ('m' in $$props) $$invalidate(0, m = $$props.m);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [m, handleMouse];
    }

    class MouseKonum extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MouseKonum",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Urunler.svelte generated by Svelte v3.48.0 */

    const file$1 = "src/Urunler.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (65:8) {#each todos as todo }
    function create_each_block(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*todo*/ ctx[10].id + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*todo*/ ctx[10].title + "";
    	let t2;
    	let t3;
    	let td2;
    	let input;
    	let input_checked_value;
    	let t4;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			input = element("input");
    			t4 = space();
    			attr_dev(td0, "class", "svelte-1twxzh9");
    			add_location(td0, file$1, 66, 16, 1312);
    			attr_dev(td1, "class", "svelte-1twxzh9");
    			add_location(td1, file$1, 67, 16, 1347);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "name", "completed");
    			attr_dev(input, "id", "completed");
    			input.checked = input_checked_value = /*todo*/ ctx[10].completed;
    			attr_dev(input, "class", "svelte-1twxzh9");
    			add_location(input, file$1, 68, 20, 1389);
    			attr_dev(td2, "class", "svelte-1twxzh9");
    			add_location(td2, file$1, 68, 16, 1385);
    			add_location(tr, file$1, 65, 12, 1291);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, input);
    			append_dev(tr, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*todos*/ 1 && t0_value !== (t0_value = /*todo*/ ctx[10].id + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*todos*/ 1 && t2_value !== (t2_value = /*todo*/ ctx[10].title + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*todos*/ 1 && input_checked_value !== (input_checked_value = /*todo*/ ctx[10].completed)) {
    				prop_dev(input, "checked", input_checked_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(65:8) {#each todos as todo }",
    		ctx
    	});

    	return block;
    }

    // (84:31) 
    function create_if_block_1(ctx) {
    	let html_tag;
    	let raw_value = girisMesaji('red', 'En çok 10 adet todo girilebilir') + "";
    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag(false);
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert_dev(target, html_anchor, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(84:31) ",
    		ctx
    	});

    	return block;
    }

    // (82:4) {#if (durum && kaybol === 'Tamam' )}
    function create_if_block(ctx) {
    	let html_tag;
    	let raw_value = girisMesaji('green', 'Giriş başarılı') + "";
    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag(false);
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert_dev(target, html_anchor, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(82:4) {#if (durum && kaybol === 'Tamam' )}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let table;
    	let tr;
    	let th0;
    	let t1;
    	let th1;
    	let t3;
    	let th2;
    	let t5;
    	let t6;
    	let form;
    	let input0;
    	let t7;
    	let input1;
    	let br;
    	let t8;
    	let button;
    	let t9;
    	let button_disabled_value;
    	let t10;
    	let if_block_anchor;
    	let mounted;
    	let dispose;
    	let each_value = /*todos*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	function select_block_type(ctx, dirty) {
    		if (/*durum*/ ctx[3] && /*kaybol*/ ctx[4] === 'Tamam') return create_if_block;
    		if (/*durum*/ ctx[3] == false) return create_if_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			table = element("table");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "id";
    			t1 = space();
    			th1 = element("th");
    			th1.textContent = "title";
    			t3 = space();
    			th2 = element("th");
    			th2.textContent = "completed";
    			t5 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t6 = space();
    			form = element("form");
    			input0 = element("input");
    			t7 = space();
    			input1 = element("input");
    			br = element("br");
    			t8 = space();
    			button = element("button");
    			t9 = text("Kaydet");
    			t10 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			add_location(th0, file$1, 59, 8, 1175);
    			add_location(th1, file$1, 60, 8, 1195);
    			add_location(th2, file$1, 61, 8, 1218);
    			add_location(tr, file$1, 58, 4, 1162);
    			add_location(table, file$1, 57, 0, 1150);
    			attr_dev(input0, "type", "text");
    			add_location(input0, file$1, 75, 4, 1610);
    			attr_dev(input1, "type", "checkbox");
    			add_location(input1, file$1, 76, 4, 1655);
    			add_location(br, file$1, 76, 53, 1704);
    			button.disabled = button_disabled_value = /*title*/ ctx[1] == '';
    			add_location(button, file$1, 77, 4, 1713);
    			add_location(form, file$1, 74, 0, 1559);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t1);
    			append_dev(tr, th1);
    			append_dev(tr, t3);
    			append_dev(tr, th2);
    			append_dev(table, t5);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(table, null);
    			}

    			insert_dev(target, t6, anchor);
    			insert_dev(target, form, anchor);
    			append_dev(form, input0);
    			set_input_value(input0, /*title*/ ctx[1]);
    			append_dev(form, t7);
    			append_dev(form, input1);
    			input1.checked = /*completed*/ ctx[2];
    			append_dev(form, br);
    			append_dev(form, t8);
    			append_dev(form, button);
    			append_dev(button, t9);
    			insert_dev(target, t10, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[6]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[7]),
    					listen_dev(form, "submit", prevent_default(/*handleSubmit*/ ctx[5]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*todos*/ 1) {
    				each_value = /*todos*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(table, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*title*/ 2 && input0.value !== /*title*/ ctx[1]) {
    				set_input_value(input0, /*title*/ ctx[1]);
    			}

    			if (dirty & /*completed*/ 4) {
    				input1.checked = /*completed*/ ctx[2];
    			}

    			if (dirty & /*title*/ 2 && button_disabled_value !== (button_disabled_value = /*title*/ ctx[1] == '')) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(form);
    			if (detaching) detach_dev(t10);

    			if (if_block) {
    				if_block.d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function girisMesaji(renk, mesaj) {
    	return `<div style="background:${renk}; color:white; padding:15px">${mesaj}</div>`;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Urunler', slots, []);
    	let id;
    	let title = '';
    	let completed = false;
    	let durum = null;
    	let kaybol;

    	let todos = [
    		{
    			"id": 1,
    			"title": "Vakko Gömlek",
    			"completed": false
    		},
    		{
    			"id": 2,
    			"title": "Adidas Ayakkabı",
    			"completed": false
    		},
    		{
    			"id": 3,
    			"title": "Bit Pazarı Pantolon",
    			"completed": false
    		},
    		{
    			"id": 4,
    			"title": "Ali baba Kazak",
    			"completed": true
    		},
    		{
    			"id": 5,
    			"title": "Deridünyası Mont",
    			"completed": false
    		}
    	];

    	const handleSubmit = async () => {
    		if (todos.length < 10) {
    			let newTodo = { id, title, completed };
    			$$invalidate(0, todos = [...todos, newTodo]);
    			clearInputs();
    		} else {
    			$$invalidate(3, durum = false);
    		}
    	};

    	function clearInputs() {
    		$$invalidate(1, title = '');
    		$$invalidate(2, completed = false);
    		$$invalidate(4, kaybol = 'Tamam');

    		setTimeout(
    			() => {
    				$$invalidate(4, kaybol = '');
    			},
    			600
    		);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Urunler> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		title = this.value;
    		$$invalidate(1, title);
    	}

    	function input1_change_handler() {
    		completed = this.checked;
    		$$invalidate(2, completed);
    	}

    	$$self.$capture_state = () => ({
    		id,
    		title,
    		completed,
    		durum,
    		kaybol,
    		todos,
    		handleSubmit,
    		clearInputs,
    		girisMesaji
    	});

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) id = $$props.id;
    		if ('title' in $$props) $$invalidate(1, title = $$props.title);
    		if ('completed' in $$props) $$invalidate(2, completed = $$props.completed);
    		if ('durum' in $$props) $$invalidate(3, durum = $$props.durum);
    		if ('kaybol' in $$props) $$invalidate(4, kaybol = $$props.kaybol);
    		if ('todos' in $$props) $$invalidate(0, todos = $$props.todos);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*todos*/ 1) {
    			id = todos.length + 1;
    		}

    		if ($$self.$$.dirty & /*todos*/ 1) {
    			$$invalidate(3, durum = todos.length > 10 ? false : true);
    		}
    	};

    	return [
    		todos,
    		title,
    		completed,
    		durum,
    		kaybol,
    		handleSubmit,
    		input0_input_handler,
    		input1_change_handler
    	];
    }

    class Urunler extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Urunler",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.48.0 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let urunler;
    	let t0;
    	let div;
    	let mousekonum;
    	let t1;
    	let input;
    	let t2;
    	let sayiarttir;
    	let current;
    	let mounted;
    	let dispose;
    	urunler = new Urunler({ $$inline: true });
    	mousekonum = new MouseKonum({ $$inline: true });

    	sayiarttir = new Say({
    			props: { renk: /*color*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(urunler.$$.fragment);
    			t0 = space();
    			div = element("div");
    			create_component(mousekonum.$$.fragment);
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			create_component(sayiarttir.$$.fragment);
    			set_style(div, "height", "80px");
    			add_location(div, file, 11, 2, 353);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "İnglizce renk girin 'orange' gibi");
    			attr_dev(input, "class", "svelte-1b08bei");
    			add_location(input, file, 14, 2, 410);
    			attr_dev(main, "style", /*mainStyle*/ ctx[1]);
    			attr_dev(main, "class", "svelte-1b08bei");
    			add_location(main, file, 9, 1, 312);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(urunler, main, null);
    			append_dev(main, t0);
    			append_dev(main, div);
    			mount_component(mousekonum, div, null);
    			append_dev(main, t1);
    			append_dev(main, input);
    			set_input_value(input, /*color*/ ctx[0]);
    			append_dev(main, t2);
    			mount_component(sayiarttir, main, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[2]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*color*/ 1 && input.value !== /*color*/ ctx[0]) {
    				set_input_value(input, /*color*/ ctx[0]);
    			}

    			const sayiarttir_changes = {};
    			if (dirty & /*color*/ 1) sayiarttir_changes.renk = /*color*/ ctx[0];
    			sayiarttir.$set(sayiarttir_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(urunler.$$.fragment, local);
    			transition_in(mousekonum.$$.fragment, local);
    			transition_in(sayiarttir.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(urunler.$$.fragment, local);
    			transition_out(mousekonum.$$.fragment, local);
    			transition_out(sayiarttir.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(urunler);
    			destroy_component(mousekonum);
    			destroy_component(sayiarttir);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let color;

    	let mainStyle = `border:2px solid pink; 
                    padding: 20px;
                    margin 0 auto; 
                    width:500px;`;

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		color = this.value;
    		$$invalidate(0, color);
    	}

    	$$self.$capture_state = () => ({
    		SayiArttir: Say,
    		MouseKonum,
    		Urunler,
    		color,
    		mainStyle
    	});

    	$$self.$inject_state = $$props => {
    		if ('color' in $$props) $$invalidate(0, color = $$props.color);
    		if ('mainStyle' in $$props) $$invalidate(1, mainStyle = $$props.mainStyle);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [color, mainStyle, input_input_handler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
