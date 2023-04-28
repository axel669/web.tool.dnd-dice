function noop() { }
const identity = x => x;
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
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
function subscribe(store, ...callbacks) {
    if (store == null) {
        return noop;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function component_subscribe(component, store, callback) {
    component.$$.on_destroy.push(subscribe(store, callback));
}
function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
        const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
        return definition[0](slot_ctx);
    }
}
function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn
        ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
        : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
        const lets = definition[2](fn(dirty));
        if ($$scope.dirty === undefined) {
            return lets;
        }
        if (typeof lets === 'object') {
            const merged = [];
            const len = Math.max($$scope.dirty.length, lets.length);
            for (let i = 0; i < len; i += 1) {
                merged[i] = $$scope.dirty[i] | lets[i];
            }
            return merged;
        }
        return $$scope.dirty | lets;
    }
    return $$scope.dirty;
}
function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
    if (slot_changes) {
        const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
        slot.p(slot_context, slot_changes);
    }
}
function get_all_dirty_from_scope($$scope) {
    if ($$scope.ctx.length > 32) {
        const dirty = [];
        const length = $$scope.ctx.length / 32;
        for (let i = 0; i < length; i++) {
            dirty[i] = -1;
        }
        return dirty;
    }
    return -1;
}
function exclude_internal_props(props) {
    const result = {};
    for (const k in props)
        if (k[0] !== '$')
            result[k] = props[k];
    return result;
}
function compute_rest_props(props, keys) {
    const rest = {};
    keys = new Set(keys);
    for (const k in props)
        if (!keys.has(k) && k[0] !== '$')
            rest[k] = props[k];
    return rest;
}
function compute_slots(slots) {
    const result = {};
    for (const key in slots) {
        result[key] = true;
    }
    return result;
}
function action_destroyer(action_result) {
    return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
}
function split_css_unit(value) {
    const split = typeof value === 'string' && value.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);
    return split ? [parseFloat(split[1]), split[2] || 'px'] : [value, 'px'];
}

const is_client = typeof window !== 'undefined';
let now = is_client
    ? () => window.performance.now()
    : () => Date.now();
let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

const tasks = new Set();
function run_tasks(now) {
    tasks.forEach(task => {
        if (!task.c(now)) {
            tasks.delete(task);
            task.f();
        }
    });
    if (tasks.size !== 0)
        raf(run_tasks);
}
/**
 * Creates a new task that runs on each raf frame
 * until it returns a falsy value or is aborted
 */
function loop(callback) {
    let task;
    if (tasks.size === 0)
        raf(run_tasks);
    return {
        promise: new Promise(fulfill => {
            tasks.add(task = { c: callback, f: fulfill });
        }),
        abort() {
            tasks.delete(task);
        }
    };
}
function append(target, node) {
    target.appendChild(node);
}
function get_root_for_style(node) {
    if (!node)
        return document;
    const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
    if (root && root.host) {
        return root;
    }
    return node.ownerDocument;
}
function append_empty_stylesheet(node) {
    const style_element = element('style');
    append_stylesheet(get_root_for_style(node), style_element);
    return style_element.sheet;
}
function append_stylesheet(node, style) {
    append(node.head || node, style);
    return style.sheet;
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    if (node.parentNode) {
        node.parentNode.removeChild(node);
    }
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
function stop_propagation(fn) {
    return function (event) {
        event.stopPropagation();
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
function set_attributes(node, attributes) {
    // @ts-ignore
    const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
    for (const key in attributes) {
        if (attributes[key] == null) {
            node.removeAttribute(key);
        }
        else if (key === 'style') {
            node.style.cssText = attributes[key];
        }
        else if (key === '__value') {
            node.value = node[key] = attributes[key];
        }
        else if (descriptors[key] && descriptors[key].set) {
            node[key] = attributes[key];
        }
        else {
            attr(node, key, attributes[key]);
        }
    }
}
function set_custom_element_data(node, prop, value) {
    if (prop in node) {
        node[prop] = typeof node[prop] === 'boolean' && value === '' ? true : value;
    }
    else {
        attr(node, prop, value);
    }
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.data === data)
        return;
    text.data = data;
}
function set_input_value(input, value) {
    input.value = value == null ? '' : value;
}
function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, bubbles, cancelable, detail);
    return e;
}
function construct_svelte_component(component, props) {
    return new component(props);
}

// we need to store the information for multiple documents because a Svelte application could also contain iframes
// https://github.com/sveltejs/svelte/issues/3624
const managed_styles = new Map();
let active = 0;
// https://github.com/darkskyapp/string-hash/blob/master/index.js
function hash(str) {
    let hash = 5381;
    let i = str.length;
    while (i--)
        hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
    return hash >>> 0;
}
function create_style_information(doc, node) {
    const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
    managed_styles.set(doc, info);
    return info;
}
function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
    const step = 16.666 / duration;
    let keyframes = '{\n';
    for (let p = 0; p <= 1; p += step) {
        const t = a + (b - a) * ease(p);
        keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
    }
    const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
    const name = `__svelte_${hash(rule)}_${uid}`;
    const doc = get_root_for_style(node);
    const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
    if (!rules[name]) {
        rules[name] = true;
        stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
    }
    const animation = node.style.animation || '';
    node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
    active += 1;
    return name;
}
function delete_rule(node, name) {
    const previous = (node.style.animation || '').split(', ');
    const next = previous.filter(name
        ? anim => anim.indexOf(name) < 0 // remove specific animation
        : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
    );
    const deleted = previous.length - next.length;
    if (deleted) {
        node.style.animation = next.join(', ');
        active -= deleted;
        if (!active)
            clear_rules();
    }
}
function clear_rules() {
    raf(() => {
        if (active)
            return;
        managed_styles.forEach(info => {
            const { ownerNode } = info.stylesheet;
            // there is no ownerNode if it runs on jsdom.
            if (ownerNode)
                detach(ownerNode);
        });
        managed_styles.clear();
    });
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error('Function called outside component initialization');
    return current_component;
}
/**
 * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
 *
 * Component events created with `createEventDispatcher` create a
 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
 * property and can contain any type of data.
 *
 * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
 */
function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail, { cancelable = false } = {}) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail, { cancelable });
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
            return !event.defaultPrevented;
        }
        return true;
    };
}
/**
 * Associates an arbitrary `context` object with the current component and the specified `key`
 * and returns that object. The context is then available to children of the component
 * (including slotted content) with `getContext`.
 *
 * Like lifecycle functions, this must be called during component initialisation.
 *
 * https://svelte.dev/docs#run-time-svelte-setcontext
 */
function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
    return context;
}
/**
 * Retrieves the context that belongs to the closest parent component with the specified `key`.
 * Must be called during component initialisation.
 *
 * https://svelte.dev/docs#run-time-svelte-getcontext
 */
function getContext(key) {
    return get_current_component().$$.context.get(key);
}
// TODO figure out if we still want to support
// shorthand events, or if we want to implement
// a real bubbling mechanism
function bubble(component, event) {
    const callbacks = component.$$.callbacks[event.type];
    if (callbacks) {
        // @ts-ignore
        callbacks.slice().forEach(fn => fn.call(this, event));
    }
}

const dirty_components = [];
const binding_callbacks = [];
let render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = /* @__PURE__ */ Promise.resolve();
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
function add_flush_callback(fn) {
    flush_callbacks.push(fn);
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
    // Do not reenter flush while dirty components are updated, as this can
    // result in an infinite loop. Instead, let the inner flush handle it.
    // Reentrancy is ok afterwards for bindings etc.
    if (flushidx !== 0) {
        return;
    }
    const saved_component = current_component;
    do {
        // first, call beforeUpdate functions
        // and update components
        try {
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
        }
        catch (e) {
            // reset dirty state to not end up in a deadlocked state and then rethrow
            dirty_components.length = 0;
            flushidx = 0;
            throw e;
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
/**
 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
 */
function flush_render_callbacks(fns) {
    const filtered = [];
    const targets = [];
    render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
    targets.forEach((c) => c());
    render_callbacks = filtered;
}

let promise;
function wait() {
    if (!promise) {
        promise = Promise.resolve();
        promise.then(() => {
            promise = null;
        });
    }
    return promise;
}
function dispatch(node, direction, kind) {
    node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
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
    else if (callback) {
        callback();
    }
}
const null_transition = { duration: 0 };
function create_bidirectional_transition(node, fn, params, intro) {
    const options = { direction: 'both' };
    let config = fn(node, params, options);
    let t = intro ? 0 : 1;
    let running_program = null;
    let pending_program = null;
    let animation_name = null;
    function clear_animation() {
        if (animation_name)
            delete_rule(node, animation_name);
    }
    function init(program, duration) {
        const d = (program.b - t);
        duration *= Math.abs(d);
        return {
            a: t,
            b: program.b,
            d,
            duration,
            start: program.start,
            end: program.start + duration,
            group: program.group
        };
    }
    function go(b) {
        const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
        const program = {
            start: now() + delay,
            b
        };
        if (!b) {
            // @ts-ignore todo: improve typings
            program.group = outros;
            outros.r += 1;
        }
        if (running_program || pending_program) {
            pending_program = program;
        }
        else {
            // if this is an intro, and there's a delay, we need to do
            // an initial tick and/or apply CSS animation immediately
            if (css) {
                clear_animation();
                animation_name = create_rule(node, t, b, duration, delay, easing, css);
            }
            if (b)
                tick(0, 1);
            running_program = init(program, duration);
            add_render_callback(() => dispatch(node, b, 'start'));
            loop(now => {
                if (pending_program && now > pending_program.start) {
                    running_program = init(pending_program, duration);
                    pending_program = null;
                    dispatch(node, running_program.b, 'start');
                    if (css) {
                        clear_animation();
                        animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                    }
                }
                if (running_program) {
                    if (now >= running_program.end) {
                        tick(t = running_program.b, 1 - t);
                        dispatch(node, running_program.b, 'end');
                        if (!pending_program) {
                            // we're done
                            if (running_program.b) {
                                // intro — we can tidy up immediately
                                clear_animation();
                            }
                            else {
                                // outro — needs to be coordinated
                                if (!--running_program.group.r)
                                    run_all(running_program.group.c);
                            }
                        }
                        running_program = null;
                    }
                    else if (now >= running_program.start) {
                        const p = now - running_program.start;
                        t = running_program.a + running_program.d * easing(p / running_program.duration);
                        tick(t, 1 - t);
                    }
                }
                return !!(running_program || pending_program);
            });
        }
    }
    return {
        run(b) {
            if (is_function(config)) {
                wait().then(() => {
                    // @ts-ignore
                    config = config(options);
                    go(b);
                });
            }
            else {
                go(b);
            }
        },
        end() {
            clear_animation();
            running_program = pending_program = null;
        }
    };
}
function outro_and_destroy_block(block, lookup) {
    transition_out(block, 1, 1, () => {
        lookup.delete(block.key);
    });
}
function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
    let o = old_blocks.length;
    let n = list.length;
    let i = o;
    const old_indexes = {};
    while (i--)
        old_indexes[old_blocks[i].key] = i;
    const new_blocks = [];
    const new_lookup = new Map();
    const deltas = new Map();
    const updates = [];
    i = n;
    while (i--) {
        const child_ctx = get_context(ctx, list, i);
        const key = get_key(child_ctx);
        let block = lookup.get(key);
        if (!block) {
            block = create_each_block(key, child_ctx);
            block.c();
        }
        else if (dynamic) {
            // defer updates until all the DOM shuffling is done
            updates.push(() => block.p(child_ctx, dirty));
        }
        new_lookup.set(key, new_blocks[i] = block);
        if (key in old_indexes)
            deltas.set(key, Math.abs(i - old_indexes[key]));
    }
    const will_move = new Set();
    const did_move = new Set();
    function insert(block) {
        transition_in(block, 1);
        block.m(node, next);
        lookup.set(block.key, block);
        next = block.first;
        n--;
    }
    while (o && n) {
        const new_block = new_blocks[n - 1];
        const old_block = old_blocks[o - 1];
        const new_key = new_block.key;
        const old_key = old_block.key;
        if (new_block === old_block) {
            // do nothing
            next = new_block.first;
            o--;
            n--;
        }
        else if (!new_lookup.has(old_key)) {
            // remove old block
            destroy(old_block, lookup);
            o--;
        }
        else if (!lookup.has(new_key) || will_move.has(new_key)) {
            insert(new_block);
        }
        else if (did_move.has(old_key)) {
            o--;
        }
        else if (deltas.get(new_key) > deltas.get(old_key)) {
            did_move.add(new_key);
            insert(new_block);
        }
        else {
            will_move.add(old_key);
            o--;
        }
    }
    while (o--) {
        const old_block = old_blocks[o];
        if (!new_lookup.has(old_block.key))
            destroy(old_block, lookup);
    }
    while (n)
        insert(new_blocks[n - 1]);
    run_all(updates);
    return new_blocks;
}

function get_spread_update(levels, updates) {
    const update = {};
    const to_null_out = {};
    const accounted_for = { $$scope: 1 };
    let i = levels.length;
    while (i--) {
        const o = levels[i];
        const n = updates[i];
        if (n) {
            for (const key in o) {
                if (!(key in n))
                    to_null_out[key] = 1;
            }
            for (const key in n) {
                if (!accounted_for[key]) {
                    update[key] = n[key];
                    accounted_for[key] = 1;
                }
            }
            levels[i] = n;
        }
        else {
            for (const key in o) {
                accounted_for[key] = 1;
            }
        }
    }
    for (const key in to_null_out) {
        if (!(key in update))
            update[key] = undefined;
    }
    return update;
}
function get_spread_object(spread_props) {
    return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
}

function bind(component, name, callback) {
    const index = component.$$.props[name];
    if (index !== undefined) {
        component.$$.bound[index] = callback;
        callback(component.$$.ctx[index]);
    }
}
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor, customElement) {
    const { fragment, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
            // if the component was destroyed immediately
            // it will update the `$$.on_destroy` reference to `null`.
            // the destructured on_destroy may still reference to the old array
            if (component.$$.on_destroy) {
                component.$$.on_destroy.push(...new_on_destroy);
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
        flush_render_callbacks($$.after_update);
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
        ctx: [],
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
        if (!is_function(callback)) {
            return noop;
        }
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

const e=/(?<key>(?<mod>\w+:)?(?<name>[\$\@\&\w\-]+)(\[(?<args>.*?)\])?)/g,t={"(":1,")":-1},r=e=>{const r=e.trim().replace(/__|_/g,(e=>"__"===e?"_":" "));if(""===r)return [];const o=r.split("").reduce(((e,o,a)=>","===o&&0===e.p?(e.args.push(r.substring(e.s,a).trim()),e.s=a,e):(e.p+=t[o]??0,e)),{args:[],p:0,s:0});return [...o.args,r.slice(o.s).trim()]},o=(e,t)=>void 0===t?"":`${e}: ${(e=>!0===e.startsWith("&")?`var(--${e.slice(1)})`:e)(t)}`,a=e=>(t,r)=>[o(e,r)],l=(...e)=>(t,r)=>e.map((e=>o(e,r)));var i$1=Object.freeze({__proto__:null,cssprop:o,multi:l,simple:a,wsx:e=>Object.entries(e).reduce(((e,[t,r])=>{if(null==r||!1===r)return e;const o=!0===r?t:`${t}[${(e=>e.replace(/( )|(_)/g,((e,t)=>t?"_":"__")))(r)}]`;return e.push(o),e}),[]).join(" ")});const n={area:a("grid-area"),b:a("border"),"b-c":a("border-color"),"b-s":a("border-style"),"b-w":a("border-width"),"b-t":a("border-top"),"b-t-c":a("border-top-color"),"b-t-s":a("border-top-style"),"b-t-w":a("border-top-width"),"b-b":a("border-bottom"),"b-b-c":a("border-bottom-color"),"b-b-s":a("border-bottom-style"),"b-b-w":a("border-bottom-width"),"b-l":a("border-left"),"b-l-c":a("border-left-color"),"b-l-s":a("border-left-style"),"b-l-w":a("border-left-width"),"b-r":a("border-right"),"b-r-c":a("border-right-color"),"b-r-s":a("border-right-style"),"b-r-w":a("border-right-width"),bg:a("background"),"bg-a":a("background-attachment"),"bg-c":a("background-color"),"bg-img":a("background-image"),block:()=>[o("display","block")],c:a("color"),col:a("grid-column"),cur:a("cursor"),flex:(e,t="column")=>[o("display","flex"),o("flex-direction",t)],"fl-center":()=>[o("align-items","center"),o("justify-content","center")],"fl-cr-a":a("align-items"),"fl-dir":a("flex-direction"),"fl-wr":a("flex-wrap"),"fl-m-a":a("justify-content"),font:a("font-family"),gap:a("gap"),grid:(e,t="row")=>[o("display","grid"),o("grid-auto-flow",t)],"gr-col":a("grid-template-columns"),"gr-row":a("grid-template-rows"),"gr-acol":a("grid-auto-columns"),"gr-arow":a("grid-auto-rows"),"gr-flow":a("grid-auto-flow"),h:a("height"),"h-max":a("max-height"),"h-min":a("min-height"),hide:()=>[o("display","none")],iblock:()=>[o("display","inline-block")],iflex:(e,t="column")=>[o("display","inline-flex"),o("flex-direction",t)],igrid:(e,t="row")=>[o("display","inline-grid"),o("grid-auto-flow",t)],inset:l("top","left","bottom","right"),"inset-x":l("left","right"),"inset-y":l("top","bottom"),m:a("margin"),"m-b":a("margin-bottom"),"m-l":a("margin-left"),"m-r":a("margin-right"),"m-t":a("margin-top"),over:a("overflow"),"over-x":a("overflow-x"),"over-y":a("overflow-y"),p:a("padding"),"p-b":a("padding-bottom"),"p-l":a("padding-left"),"p-r":a("padding-right"),"p-t":a("padding-top"),"p-x":l("padding-left","padding-right"),"p-y":l("padding-top","padding-bottom"),pos:a("position"),r:a("border-radius"),"r-tl":a("border-top-left-radius"),"r-tr":a("border-top-right-radius"),"r-bl":a("border-bottom-left-radius"),"r-br":a("border-bottom-right-radius"),"r-t":l("border-top-left-radius","border-top-right-radius"),"r-r":l("border-top-right-radius","border-bottom-right-radius"),"r-l":l("border-bottom-left-radius","border-top-left-radius"),"r-b":l("border-bottom-right-radius","border-bottom-left-radius"),row:a("grid-row"),sel:a("user-select"),shdw:a("box-shadow"),"t-a":a("text-align"),"t-br":a("word-break"),"t-deco":a("text-decoration"),"t-lh":a("line-height"),"t-over":a("text-overflow"),"t-sz":a("font-size"),"t-tr":a("text-transform"),"t-wght":a("font-weight"),"t-ws":a("white-space"),theme:()=>[o("color","var(--text-color-normal)"),o("font-family","var(--font)"),o("font-size","var(--text-size-normal)")],tr:a("transform"),w:a("width"),"w-max":a("max-width"),"w-min":a("min-width"),x:a("left"),y:a("top"),"-x":a("right"),"-y":a("bottom"),z:a("z-index"),$color:(e,t)=>[o("--color",`&${t}`),o("--ripple-color",`&${t}-ripple`)],$adorn:()=>[o("display","flex"),o("justify-content","center"),o("align-items","center"),o("padding","2px")],$compact:()=>[o("padding","0px 8px")],$title:()=>[o("font-size","&text-size-title"),o("font-weight","700")],$subtitle:()=>[o("font-size","&text-size-subtitle")],"@flat":()=>[o("border-width","0px"),o("--border-size","0px")],"@outline":()=>[o("border-width","1px"),o("border-color","&color")],"@fill":()=>[o("--ripple-color","var(--ripple-dark) !important"),o("--text-color","&text-color-fill"),o("background-color","&color"),o("color","&text-color-fill")]};var s=[{name:"baseline",style:'@import url(https://fonts.googleapis.com/css2?family=Share+Tech+Mono:wght@400;500;600;700;800;900&family=Roboto:ital,wght@0,400;0,500;0,700;0,900;1,400;1,500;1,700;1,900&display=swap);@import url(https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.13.0/tabler-icons.min.css);*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}:where([ws-x]){border-style:solid;border-width:0;border-color:var(--text-color-normal)}body,html{padding:0;margin:0;width:100%;height:100%;-webkit-tap-highlight-color:transparent}body[ws-x*="theme["]{background-color:var(--background)}body[ws-x~="@app"]{overflow:hidden;position:fixed;touch-action:pan-x pan-y}'},{name:"avatar",style:"ws-avatar{--color:transparent;--size:36px;display:inline-flex;overflow:hidden;border-radius:500px;align-items:center;justify-content:center;width:var(--size);height:var(--size);background-color:var(--color);color:var(--text-color-fill);vertical-align:text-bottom}ws-avatar>img{width:100%}"},{name:"badge",style:"ws-badge{--color:var(--primary);position:relative;display:inline-grid;overflow:visible}ws-badge::after{position:absolute;content:attr(ws-text);right:-10px;top:0;transform:translateY(-50%);background-color:var(--color);pointer-events:none;border-radius:20px;padding:4px;min-width:20px;height:20px;box-sizing:border-box;text-align:center;font-size:var(--text-size-subtitle);color:var(--text-color-fill);line-height:14px;z-index:5}"},{name:"button",style:':is(label,a):where([ws-x~="@button"]),button:where([ws-x~="@flat"],[ws-x~="@fill"],[ws-x~="@outline"]){--color:var(--text-color-normal);--ripple-color:var(--ripple-normal);border:0 solid var(--color);color:var(--color);font-family:var(--font);background-color:transparent;border-radius:4px;cursor:pointer;padding:8px 16px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;position:relative;user-select:none}:is(label,a):where([ws-x~="@button"]):where(:not([disabled]))::after,button:where([ws-x~="@flat"],[ws-x~="@fill"],[ws-x~="@outline"]):where(:not([disabled]))::after{content:"";position:absolute;top:0;left:0;bottom:0;right:0;transition:background-color 150ms linear;pointer-events:none}:is(label,a):where([ws-x~="@button"]):where(:not([disabled])):active::after,button:where([ws-x~="@flat"],[ws-x~="@fill"],[ws-x~="@outline"]):where(:not([disabled])):active::after{transition:none;background-color:var(--ripple-color)}:is(label,a):where([ws-x~="@button"]):where([disabled]),button:where([ws-x~="@flat"],[ws-x~="@fill"],[ws-x~="@outline"]):where([disabled]){opacity:.6;background-color:rgba(200,200,200,.4)}'},{name:"chip",style:'ws-chip{display:inline-flex;align-items:center;justify-content:center;border-radius:100px;padding:4px 12px;user-select:none;vertical-align:text-bottom}ws-chip:where([ws-x~="$click"]){cursor:pointer;overflow:hidden;position:relative;user-select:none}ws-chip:where([ws-x~="$click"]):where(:not([disabled]))::after{content:"";position:absolute;top:0;left:0;bottom:0;right:0;transition:background-color 150ms linear;pointer-events:none}ws-chip:where([ws-x~="$click"]):where(:not([disabled])):active::after{transition:none;background-color:var(--ripple-color)}'},{name:"control",style:'label:where([ws-x~="@control"]){--color:var(--default);--border-color:var(--default);position:relative;display:inline-grid;grid-template-areas:"label label label"" start control end""extra extra extra";grid-template-rows:minmax(0,min-content) auto minmax(0,min-content);grid-template-columns:minmax(0,min-content) auto minmax(0,min-content);border:1px solid var(--border-color);border-radius:4px;user-select:none;overflow:hidden}label:where([ws-x~="@control"]):where([ws-error])::after{content:attr(ws-error);grid-row:3;grid-column:span 3;padding:4px;font-size:var(--text-size-info);background-color:var(--danger-ripple)}label:where([ws-x~="@control"]):focus-within{--border-color:var(--color)}label:where([ws-x~="@control"]):focus-within:where([ws-x~="@flat"])>:is(input,select){outline:2px solid var(--ripple-color);outline-offset:-2px}label:where([ws-x~="@control"]) :is(input,select,textarea):disabled{background-color:var(--disabled-background)}label:where([ws-x~="@control"])>:where(select){--color:var(--text-color-normal);border-width:0;padding:8px;min-height:36px;background-color:transparent;color:var(--color);font:var(--font);font-size:var(--text-size-normal);cursor:pointer;background-color:var(--background-layer);grid-area:control}label:where([ws-x~="@control"])>:where(input,textarea):focus,label:where([ws-x~="@control"])>:where(select):focus{outline:0}label:where([ws-x~="@control"])>:where(select) optgroup,label:where([ws-x~="@control"])>:where(select) option{background-color:var(--background-layer);border-color:var(--background-layer);color:var(--text-color-normal);font-size:var(--text-size-normal);font-family:Arial}label:where([ws-x~="@control"])>:where(input,textarea){border-width:0;background:0 0;color:var(--text-normal-color);font-family:var(--font);min-width:24px;min-height:36px;width:100%;height:100%;grid-area:control;padding:4px;background-color:var(--background-layer)}label:where([ws-x~="@control"])>input[type=file]{position:relative;padding:0}label:where([ws-x~="@control"])>input[type=file]::file-selector-button{font-family:var(--font);height:100%;margin:0 4px 0 0;padding:4px;color:var(--text-normal-color);background-color:var(--background-layer);border-width:0;border-right:1px solid var(--border-color);text-decoration:underline}label:where([ws-x~="@control"])>:where([ws-x~="$text"]){grid-area:label;padding:4px;display:flex;align-items:center;border-bottom:var(--border-size, 1px) solid var(--border-color);border-right:var(--border-size, 1px) solid var(--border-color);color:var(--color);width:min-content;white-space:nowrap;border-bottom-right-radius:4px}label:where([ws-x~="@control"])>:where([ws-x~="$text"]):where([ws-hint])::after{font-size:var(--text-size-subtitle);content:"\\a"attr(ws-hint);color:var(--text-color-secondary);white-space:pre;display:contents}label:where([ws-x~="@control"])>:where([ws-x~="slot[start]"],[slot=start]){grid-area:start}label:where([ws-x~="@control"])>:where([ws-x~="slot[end]"],[slot=end]){grid-area:end}'},{name:"flex",style:"ws-flex{display:flex;flex-direction:column;gap:4px;padding:4px;overflow:hidden}ws-flex>*{flex-shrink:0}"},{name:"grid",style:"ws-grid{display:grid;overflow:hidden;gap:4px;padding:4px;grid-auto-rows:min-content}"},{name:"icon",style:"ws-icon{display:inline-block}ws-icon:where(:not(:empty))::before{margin-right:2px}ws-icon::before{font-family:tabler-icons!important;speak:none;font-style:normal;font-weight:400;font-variant:normal;text-transform:none;line-height:1;display:contents;-webkit-font-smoothing:antialiased}"},{name:"link",style:"a:where([ws-x]){--color:var(--text-color-normal)}a:where([ws-x]),a:where([ws-x]):hover,a:where([ws-x]):visited{color:var(--color)}"},{name:"modal",style:'ws-modal{position:fixed;top:0;left:0;bottom:0;right:0;background-color:rgba(0,0,0,.35);z-index:100;display:none}ws-modal>label:first-child{position:absolute;width:100%;height:100%;cursor:pointer}ws-modal[ws-x~="$show"]{display:block}input[type=checkbox]:not(:checked)+ws-modal{display:none}input[type=checkbox]:checked+ws-modal{display:block}ws-modal>:where(:not(label:first-child)){position:absolute;min-width:15vw}ws-modal>:where(:not(label:first-child)):where([ws-x~="@menu"]){top:0;left:0;height:100%}ws-modal>:where(:not(label:first-child)):where([ws-x~="@action"]){top:0;right:0;height:100%}ws-modal>:where(:not(label:first-child)):where([ws-x~="@select"]){top:0;left:50%;transform:translateX(-50%);max-height:75vh;max-width:min(90vw,720px)}ws-modal>:where(:not(label:first-child)):where([ws-x~="@dialog"]){top:50%;left:50%;transform:translate(-50%,-50%)}'},{name:"notification",style:'ws-notification{--background-color:var(--background-layer);--color:var(--text-color-normal);background-color:var(--background-color);color:var(--color);padding:8px;display:inline-flex;flex-direction:row;justify-content:space-between;align-items:center;border-radius:4px;cursor:pointer;user-select:none;border:1px solid var(--text-color-secondary)}ws-notification[ws-x*="$color"]{background-color:var(--color);color:var(--text-color-fill)}'},{name:"paper",style:'ws-paper{--color:var(--layer-border-color);display:grid;border-radius:4px;box-shadow:0 2px 4px var(--shadow-color);overflow:hidden;grid-template-columns:1fr;grid-template-rows:min-content auto min-content;grid-template-areas:"header""content""footer";background-color:var(--background-layer)}ws-paper::before{content:"";grid-area:header}ws-paper::after{content:"";grid-area:footer;pointer-events:none}ws-paper>:where([ws-x~="slot[content]"],[slot=content]){grid-area:content}ws-paper>:where([ws-x~="slot[header]"],[slot=header]){grid-area:header;font-size:var(--text-size-header)}ws-paper>:where([ws-x~="slot[footer]"],[slot=footer]){grid-area:footer}'},{name:"popover",style:'ws-popover{display:grid;position:relative}ws-popover:not(:visibile)>:where([ws-x~="slot[content]"],[slot=content]){display:none}ws-popover>:where([ws-x~="slot[content]"],[slot=content]){position:absolute;z-index:25;display:none}ws-popover[ws-x~="$show"]>:where([ws-x~="slot[content]"],[slot=content]){display:block}ws-popover>input:where([type=checkbox]):checked+:where([ws-x~="slot[content]"],[slot=content]){display:block}ws-popover>input:where([type=checkbox]):not(:checked)+:where([ws-x~="slot[content]"],[slot=content]){display:none}'},{name:"progress",style:'label[ws-x~="@progress"]{--color:var(--text-color-normal);--border-size:0px;display:inline-grid;grid-template-columns:1fr;grid-template-rows:min-content auto;border-radius:4px;overflow:hidden;user-select:none}label[ws-x~="@progress"][ws-x~="$row"]{grid-template-columns:min-content auto;grid-template-rows:1fr}label[ws-x~="@progress"]>[ws-x~="$text"]{padding:4px;display:flex;border-bottom:var(--border-size, 1px) solid var(--color);color:var(--color)}label[ws-x~="@progress"]>progress{min-height:20px;height:100%;width:100%;border:0;background-color:var(--background-layer)}label[ws-x~="@progress"]>progress::-moz-progress-bar{background-color:var(--color);border-radius:0}label[ws-x~="@progress"]>progress::-webkit-progress-bar{background-color:var(--background-layer);border-radius:0}label[ws-x~="@progress"]>progress::-webkit-progress-value{background-color:var(--color);border-radius:0}'},{name:"screen",style:'ws-screen{--stack:0;--screen-width:min(720px, 100%);display:grid;width:calc(100% - var(--sub-pixel-offset));height:calc(100% - 1px);overflow:hidden;position:fixed;top:0;left:0;z-index:200;background-color:rgba(0,0,0,.4);grid-template-columns:auto calc(var(--screen-width) - 16px*var(--stack)) auto;grid-template-areas:". content .";padding-top:calc(8px*var(--stack))}ws-screen[ws-x~="@left"]{grid-template-columns:calc(8px*var(--stack)) calc(var(--screen-width) - 16px*var(--stack)) auto}ws-screen>:where(*){grid-area:content;height:100%;overflow:hidden}'},{name:"spinner",style:"ws-circle-spinner,ws-hexagon-spinner{--size:100px;--color:var(--primary);--ripple-color:var(--primary-ripple);width:var(--size);height:var(--size);display:inline-block}"},{name:"table",style:"table:where([ws-x]){--border-color:var(--color);border-spacing:0;position:relative}table:where([ws-x]) thead :is(td,th){background-color:var(--color);color:var(--text-color-fill);font-weight:700}table:where([ws-x]) :is(td,th){padding:8px;white-space:nowrap;background-color:var(--background-layer);border-bottom:1px solid var(--color)}table:where([ws-x]) :where(th:first-child){position:sticky;left:0;z-index:10}table:where([ws-x]) :where(td:first-child,th:first-child){border-left:1px solid var(--color)}table:where([ws-x]) :where(td:last-child,th:last-child){border-right:1px solid var(--color)}"},{name:"tabs",style:'ws-tabs{--color:var(--primary);display:flex;flex-direction:row;justify-content:stretch;align-items:stretch;user-select:none;cursor:pointer;gap:2px;padding:2px}ws-tabs[ws-x~="$vert"]{flex-direction:column;justify-content:flex-start}ws-tabs[ws-x~="$vert"]>ws-tab{border-bottom-width:0;border-right-width:2px;flex-grow:0}ws-tabs[ws-x~="@solid"]>ws-tab:where([tab-selected]){color:var(--text-color-fill);background-color:var(--color)}ws-tabs>ws-tab{display:flex;justify-content:center;align-items:center;flex-grow:1;padding:8px;border-color:var(--text-color-secondary);border-width:0 0 2px;border-style:solid}ws-tabs>ws-tab:where([tab-selected]){color:var(--color);border-color:var(--color)}'},{name:"titlebar",style:'ws-titlebar{--text-color:var(--text-color-normal);display:grid;height:48px;grid-template-columns:min-content auto min-content;grid-template-areas:"menu title action";user-select:none}ws-titlebar:where(:not([ws-x~="@fill"])){border-bottom:1px solid var(--color, var(--text-color-normal))}ws-titlebar>:where([ws-x~="slot[title]"],[slot=title]){grid-area:title;display:flex;flex-direction:column;justify-content:center;padding:4px}ws-titlebar>:where([ws-x~="slot[menu]"],[slot=menu]){grid-area:menu;--text-color-normal:var(--text-color)}ws-titlebar>:where([ws-x~="slot[action]"],[slot=action]){grid-area:action;--text-color-normal:var(--text-color)}'},{name:"toaster",style:'ws-toaster{position:fixed;z-index:100;display:inline-flex;flex-direction:column;padding:4px;gap:4px;height:min-content!important}ws-toaster[ws-x~="$tl"]{top:0;left:0}ws-toaster[ws-x~="$tc"]{top:0;left:50%;transform:translateX(-50%)}ws-toaster[ws-x~="$tr"]{top:0;right:0}ws-toaster[ws-x~="$ml"]{top:50%;left:0;transform:translateY(-50%)}ws-toaster[ws-x~="$mr"]{top:50%;right:0;transform:translateY(-50%)}ws-toaster[ws-x~="$bl"]{bottom:0;left:0}ws-toaster[ws-x~="$bc"]{bottom:0;left:50%;transform:translateX(-50%)}ws-toaster[ws-x~="$br"]{bottom:0;right:0}'},{name:"toggle",style:'label[ws-x~="@toggle"]{--color:var(--default);--ripple-color:var(--default-ripple);--border-color:var(--default);cursor:pointer;display:inline-flex;align-items:center;justify-content:space-between;padding:4px;border-radius:4px;border:1px solid var(--border-color);overflow:hidden;position:relative;user-select:none}label[ws-x~="@toggle"]:where(:not([disabled]))::after{content:"";position:absolute;top:0;left:0;bottom:0;right:0;transition:background-color 150ms linear;pointer-events:none}label[ws-x~="@toggle"]:where(:not([disabled])):active::after{transition:none;background-color:var(--ripple-color)}label[ws-x~="@toggle"]:focus-within{--border-color:var(--color)}label[ws-x~="@toggle"]:focus-within:where([ws-x~="@flat"]){outline:2px solid var(--ripple-color);outline-offset:-2px}label[ws-x~="@toggle"]>input{position:relative;min-width:20px;min-height:20px;-webkit-appearance:none;appearance:none;margin:0}label[ws-x~="@toggle"]>input:focus{outline:0}label[ws-x~="@toggle"]>input:disabled{--color:var(--disabled-background)}label[ws-x~="@toggle"]>input:checked{color:var(--text-color-invert)}label[ws-x~="@toggle"]>input:checked::after{background-color:var(--color)}label[ws-x~="@toggle"]>input::after{content:"";position:absolute;font-size:18px;font-family:tabler-icons!important;speak:none;font-style:normal;font-weight:400;font-variant:normal;text-transform:none;top:50%;left:50%;width:20px;height:20px;transform:translate(-50%,-50%);display:flex;border:1px solid var(--color);border-radius:4px;align-items:center;justify-content:center;overflow:hidden}label[ws-x~="@toggle"]>input[type=radio]::after{border-radius:50%}label[ws-x~="@toggle"]>input[type=checkbox]:disabled,label[ws-x~="@toggle"]>input[type=radio]:disabled::after{background-color:var(--disabled-background)}label[ws-x~="@toggle"]>input[type=radio]:checked::after{content:""}label[ws-x~="@toggle"]>input[type=checkbox]:checked::after{content:""}label[ws-x~="@toggle"]>input[type=checkbox][ws-x~="$switch"]{position:relative;border:1px solid var(--color);height:24px;width:44px;border-radius:12px}label[ws-x~="@toggle"]>input[type=checkbox][ws-x~="$switch"]::after{content:"";background-color:var(--text-color-secondary);position:absolute;width:18px;height:18px;border-radius:10px;top:2px;left:2px;transform:none;border-width:0;transition:left 100ms linear,color 100ms linear}label[ws-x~="@toggle"]>input[type=checkbox][ws-x~="$switch"]:checked::after{background-color:var(--color);left:22px}'},{name:"tooltip",style:'ws-tooltip{position:relative;display:inline-grid;overflow:visible}ws-tooltip::after{position:absolute;content:attr(ws-text);left:50%;bottom:calc(100% + 2px);transform:translateX(-50%);height:20px;background-color:var(--background-layer);opacity:0;transition:opacity 100ms linear;pointer-events:none;border-radius:4px;border:1px solid var(--text-color-secondary);padding:2px 8px;font-size:var(--text-size-subtitle);width:60%;display:flex;align-items:center;justify-content:center;z-index:5}ws-tooltip:hover::after{opacity:1}ws-tooltip[ws-x~="$bottom"]::after{bottom:unset;top:calc(100% + 2px)}'},{name:"dark",style:'[ws-x~="theme[dark]"]{--font:Roboto;--text-light:white;--text-dark:black;--text-color-normal:var(--text-light);--text-color-secondary:#a0a0a0;--text-color-invert:var(--text-dark);--text-color-fill:var(--text-dark);--text-size-normal:14px;--text-size-title:18px;--text-size-header:16px;--text-size-info:13px;--text-size-subtitle:12px;--text-size-data:10px;--background:#161616;--background-layer:#333333;--layer-border-width:1px;--layer-border-color:#505050;--default:var(--text-color-normal);--default-ripple:var(--ripple-normal);--primary:#00aaff;--primary-ripple:#00aaff60;--secondary:#2fbc2f;--secondary-ripple:#2fbc2f60;--danger:#df5348;--danger-ripple:#df534860;--warning:#ffff00;--warning-ripple:#ffff0060;--accent:#ff4dff;--accent-ripple:#ff4dff60;--button-filled-text-color:var(--text-color-normal);--ripple-dark:#00000060;--ripple-light:#FFFFFF60;--ripple-normal:var(--ripple-light);--ripple-invert:var(--ripple-dark);--shadow-color:rgb(0, 0, 0, 0.25);--disabled-background:#606060;color-scheme:dark}'},{name:"light",style:'[ws-x~="theme[light]"]{--font:Roboto;--text-light:white;--text-dark:black;--text-color-normal:var(--text-dark);--text-color-secondary:#505050;--text-color-invert:var(--text-light);--text-color-fill:var(--text-light);--text-size-normal:14px;--text-size-title:18px;--text-size-header:16px;--text-size-info:13px;--text-size-subtitle:12px;--text-size-data:10px;--background:#e9e9e9;--background-layer:#ffffff;--layer-border-width:1px;--layer-border-color:#aaaaaa;--default:var(--text-color-normal);--default-ripple:var(--ripple-normal);--primary:#1d62d5;--primary-ripple:#1d62d560;--secondary:#128f12;--secondary-ripple:#128f1260;--danger:#F44336;--danger-ripple:#F4433660;--warning:#db990d;--warning-ripple:#db990d60;--accent:#cf00cf;--accent-ripple:#cf00cf60;--button-filled-text-color:var(--text-color-invert);--ripple-dark:#00000060;--ripple-light:#FFFFFF60;--ripple-normal:var(--ripple-dark);--ripple-invert:var(--ripple-light);--shadow-color:rgb(0, 0, 0, 0.25);--disabled-background:#c7c7c7}'},{name:"tron",style:'[ws-x~="theme[tron]"]{--font:Share Tech Mono;--text-light:white;--text-dark:black;--text-color-normal:var(--text-light);--text-color-secondary:#a0a0a0;--text-color-invert:var(--text-dark);--text-color-fill:var(--text-dark);--text-size-normal:14px;--text-size-title:18px;--text-size-header:16px;--text-size-info:13px;--text-size-subtitle:12px;--text-size-data:10px;--background:#030303;--background-layer:#04080C;--layer-border-width:1px;--layer-border-color:#00EEEE;--default:var(--text-color-normal);--default-ripple:var(--ripple-normal);--primary:#00aaff;--primary-ripple:#00aaff60;--secondary:#2fbc2f;--secondary-ripple:#2fbc2f60;--danger:#df5348;--danger-ripple:#df534860;--warning:#ffff00;--warning-ripple:#ffff0060;--accent:#ff4dff;--accent-ripple:#ff4dff60;--button-filled-text-color:var(--text-normal);--ripple-dark:#00000060;--ripple-light:#FFFFFF60;--ripple-normal:var(--ripple-light);--ripple-invert:var(--ripple-dark);--shadow-color:rgb(255, 255, 255, 0.25);--disabled-background:#606060;color-scheme:dark}'}];const d=document.head,c=document.createElement("style"),p=Math.ceil(screen.width*devicePixelRatio*10)%10>=5;s.push({name:"correction",style:`body {--sub-pixel-offset:${p?1:0}px}`});for(const{name:e,style:t}of s){const r=document.createElement("style");r.setAttribute("ws-name",e),r.innerHTML=t,d.appendChild(r);}d.appendChild(c),c.setAttribute("ws-calculated","");const b=c.sheet,w={},x=(e,t)=>[o(`--${e.name.slice(1)}`,t)],h=e=>{if(null===e)return;const t=void 0!==w[e.key],r=void 0===n[e.name]&&!1===e.name.startsWith("&");if(!0===t||!0===r)return;const o=!0===e.name.startsWith("&")?x:n[e.name],a=void 0!==e.mod?`:${e.mod.slice(0,-1)}`:"",l=o(e,...e.args);b.insertRule(`[ws-x][ws-x~="${e.key}"]${a} {\n${l.join(";\n")};\n}`,b.cssRules.length),w[e.key]=b.cssRules[b.cssRules.length-1];},g=t=>{const o=t.getAttribute("ws-x");if(null===o)return;const a=((t,o)=>[...t.matchAll(e)].map((e=>{const{groups:t}=e;return {name:t.name,mod:t.mod,args:r(t.args??""),key:e[0],node:o}})))(o,t);a.forEach(h);},f=document.createElement("template");f.innerHTML='\n<style>\n@keyframes hi{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}\ncircle{animation-name:hi;animation-iteration-count:infinite;animation-timing-function:linear;transform-origin:50% 50%;}\ncircle:nth-child(1){animation-duration:4s;}\ncircle:nth-child(2){animation-duration:3s;animation-direction:reverse;}\ncircle:nth-child(3){animation-duration:2s;}\n</style>\n<svg style="width:var(--size);height:var(--size)" viewBox="0 0 100 100"><circle stroke="var(--color)" cx="50" cy="50" stroke-width="4" fill="transparent" r="48" stroke-dasharray="0 37.7 75.4 75.4 75.4 75.4"/><circle stroke="var(--ripple-color)" cx="50" cy="50" stroke-width="4" fill="transparent" r="40" stroke-dasharray="0 31.4 62.83 62.83 62.83 62.83"/><circle stroke="var(--color)" cx="50" cy="50" stroke-width="4" fill="transparent" r="32" stroke-dasharray="0 12.57 25.13 25.13 25.13 25.13 25.13 25.13 25.13 25.13"/></svg>',customElements.define("ws-circle-spinner",class extends HTMLElement{constructor(){super();const e=f.content.cloneNode(!0);this.attachShadow({mode:"closed"}).appendChild(e);}});const m=document.createElement("template");m.innerHTML='\n<style>\n@keyframes hi{from{transform:rotateY(0deg)}to{transform:rotateY(360deg)}}\npath{animation-name:hi;animation-iteration-count:infinite;animation-timing-function:linear;transform-origin:50% 50%;}\npath:nth-child(1){animation-duration:3s;}\npath:nth-child(2){animation-duration:2s;animation-direction:reverse;}\npath:nth-child(3){animation-duration:1s;}\n</style><svg style="width: var(--size); height: var(--size);" viewBox="0 0 100 100"><path stroke="var(--color)" stroke-width="4" fill="none" d="M91.57 26v48L50 98 8.43 74V26L50 2l41.57 24Z"/><path stroke="var(--ripple-color)" stroke-width="4" fill="none" d="M81.177 32v36L50 86 18.823 68V32L50 14l31.177 18Z"/><path stroke="var(--color)" stroke-width="4" fill="none" d="M70.785 38v24L50 74 29.215 62V38L50 26l20.785 12Z"/></svg>',customElements.define("ws-hexagon-spinner",class extends HTMLElement{constructor(){super();const e=m.content.cloneNode(!0);this.attachShadow({mode:"closed"}).appendChild(e);}});const u={childList(e){if(0!==e.addedNodes.length)for(const t of e.addedNodes){(void 0===t.tagName?[]:[t,...t.querySelectorAll("*")]).forEach(g);}},attributes(e){g(e.target);}};new MutationObserver((e=>e.forEach((e=>u[e.type](e))))).observe(document.body,{subtree:!0,attributes:!0,childList:!0,attributeFilter:["ws-x"]});for(const e of document.body.querySelectorAll("*"))g(e);

const { wsx } = i$1;

/*md
[@] Actions/wsx

# wsx Action

The wsx action can be used to set the `ws-x` attribute on a DOM element by using
an object as the source rather than trying to do the string manipulation
directly.
- `null`, `undefined`, and `false` will not insert the wind function
- `true` will insert the wind function with no args
- any string value will insert the wind function with the arguments formatted
    for the parser (replace spaces and underscores as needed).

## Usage
```js
// will generate ws-x="grid gr-col[1fr_1fr]"
$: windStff = {
    grid: true,
    gr-col: "1fr 1fr",
    p: false
}
```
```svelte
<div use:wsx={windStuff}>
</div>
```
*/

var wsx$1 = (node, props) => {
    const update = (props) => {
        if (props === null || props === undefined) {
            node.setAttribute("ws-x", null);
            return
        }
        node.setAttribute(
            "ws-x",
            wsx(props)
        );
    };
    update(props);
    return { update }
};

/* node_modules\@axel669\zephyr\src\button.svelte generated by Svelte v3.58.0 */

function create_else_block$1(ctx) {
	let button;
	let wsx_action;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[8].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], null);

	return {
		c() {
			button = element("button");
			if (default_slot) default_slot.c();
			button.disabled = /*disabled*/ ctx[0];
		},
		m(target, anchor) {
			insert(target, button, anchor);

			if (default_slot) {
				default_slot.m(button, null);
			}

			current = true;

			if (!mounted) {
				dispose = [
					action_destroyer(wsx_action = wsx$1.call(null, button, /*wind*/ ctx[3])),
					listen(button, "click", stop_propagation(/*click_handler_1*/ ctx[10]))
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 128)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[7],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[7])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[7], dirty, null),
						null
					);
				}
			}

			if (!current || dirty & /*disabled*/ 1) {
				button.disabled = /*disabled*/ ctx[0];
			}

			if (wsx_action && is_function(wsx_action.update) && dirty & /*wind*/ 8) wsx_action.update.call(null, /*wind*/ ctx[3]);
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(button);
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (72:0) {#if label === true}
function create_if_block$5(ctx) {
	let label_1;
	let wsx_action;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[8].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], null);

	return {
		c() {
			label_1 = element("label");
			if (default_slot) default_slot.c();
			attr(label_1, "disabled", /*disabled*/ ctx[0]);
			attr(label_1, "for", /*_for*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, label_1, anchor);

			if (default_slot) {
				default_slot.m(label_1, null);
			}

			current = true;

			if (!mounted) {
				dispose = [
					action_destroyer(wsx_action = wsx$1.call(null, label_1, /*wind*/ ctx[3])),
					listen(label_1, "click", stop_propagation(/*click_handler*/ ctx[9]))
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 128)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[7],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[7])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[7], dirty, null),
						null
					);
				}
			}

			if (!current || dirty & /*disabled*/ 1) {
				attr(label_1, "disabled", /*disabled*/ ctx[0]);
			}

			if (!current || dirty & /*_for*/ 2) {
				attr(label_1, "for", /*_for*/ ctx[1]);
			}

			if (wsx_action && is_function(wsx_action.update) && dirty & /*wind*/ 8) wsx_action.update.call(null, /*wind*/ ctx[3]);
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(label_1);
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

function create_fragment$g(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block$5, create_else_block$1];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*label*/ ctx[2] === true) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$g($$self, $$props, $$invalidate) {
	let wind;
	const omit_props_names = ["color","compact","variant","disabled","for","label"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	let { color = "default" } = $$props;
	let { compact = false } = $$props;
	let { variant = "flat" } = $$props;
	let { disabled } = $$props;
	let { for: _for = "" } = $$props;
	let { label = false } = $$props;

	function click_handler(event) {
		bubble.call(this, $$self, event);
	}

	function click_handler_1(event) {
		bubble.call(this, $$self, event);
	}

	$$self.$$set = $$new_props => {
		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
		$$invalidate(11, $$restProps = compute_rest_props($$props, omit_props_names));
		if ('color' in $$new_props) $$invalidate(4, color = $$new_props.color);
		if ('compact' in $$new_props) $$invalidate(5, compact = $$new_props.compact);
		if ('variant' in $$new_props) $$invalidate(6, variant = $$new_props.variant);
		if ('disabled' in $$new_props) $$invalidate(0, disabled = $$new_props.disabled);
		if ('for' in $$new_props) $$invalidate(1, _for = $$new_props.for);
		if ('label' in $$new_props) $$invalidate(2, label = $$new_props.label);
		if ('$$scope' in $$new_props) $$invalidate(7, $$scope = $$new_props.$$scope);
	};

	$$self.$$.update = () => {
		$$invalidate(3, wind = {
			[`@${variant}`]: true,
			$color: color,
			$compact: compact,
			"@button": label,
			...$$restProps
		});
	};

	return [
		disabled,
		_for,
		label,
		wind,
		color,
		compact,
		variant,
		$$scope,
		slots,
		click_handler,
		click_handler_1
	];
}

class Button extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$g, create_fragment$g, safe_not_equal, {
			color: 4,
			compact: 5,
			variant: 6,
			disabled: 0,
			for: 1,
			label: 2
		});
	}
}

function cubicOut(t) {
    const f = t - 1.0;
    return f * f * f + 1.0;
}

function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
    const style = getComputedStyle(node);
    const target_opacity = +style.opacity;
    const transform = style.transform === 'none' ? '' : style.transform;
    const od = target_opacity * (1 - opacity);
    const [xValue, xUnit] = split_css_unit(x);
    const [yValue, yUnit] = split_css_unit(y);
    return {
        delay,
        duration,
        easing,
        css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * xValue}${xUnit}, ${(1 - t) * yValue}${yUnit});
			opacity: ${target_opacity - (od * u)}`
    };
}

/* node_modules\@axel669\zephyr\src\flex.svelte generated by Svelte v3.58.0 */

function create_fragment$f(ctx) {
	let ws_flex;
	let wsx_action;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[7].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

	return {
		c() {
			ws_flex = element("ws-flex");
			if (default_slot) default_slot.c();
		},
		m(target, anchor) {
			insert(target, ws_flex, anchor);

			if (default_slot) {
				default_slot.m(ws_flex, null);
			}

			current = true;

			if (!mounted) {
				dispose = action_destroyer(wsx_action = wsx$1.call(null, ws_flex, /*wind*/ ctx[0]));
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 64)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[6],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[6])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[6], dirty, null),
						null
					);
				}
			}

			if (wsx_action && is_function(wsx_action.update) && dirty & /*wind*/ 1) wsx_action.update.call(null, /*wind*/ ctx[0]);
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(ws_flex);
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			dispose();
		}
	};
}

function instance$f($$self, $$props, $$invalidate) {
	let wind;
	const omit_props_names = ["direction","pad","gap","cross","main"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	let { direction = false } = $$props;
	let { pad = false } = $$props;
	let { gap = false } = $$props;
	let { cross = "start" } = $$props;
	let { main = "start" } = $$props;

	$$self.$$set = $$new_props => {
		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
		$$invalidate(8, $$restProps = compute_rest_props($$props, omit_props_names));
		if ('direction' in $$new_props) $$invalidate(1, direction = $$new_props.direction);
		if ('pad' in $$new_props) $$invalidate(2, pad = $$new_props.pad);
		if ('gap' in $$new_props) $$invalidate(3, gap = $$new_props.gap);
		if ('cross' in $$new_props) $$invalidate(4, cross = $$new_props.cross);
		if ('main' in $$new_props) $$invalidate(5, main = $$new_props.main);
		if ('$$scope' in $$new_props) $$invalidate(6, $$scope = $$new_props.$$scope);
	};

	$$self.$$.update = () => {
		$$invalidate(0, wind = {
			"fl-dir": direction,
			"fl-cr-a": cross,
			"fl-m-a": main,
			p: pad,
			gap,
			...$$restProps
		});
	};

	return [wind, direction, pad, gap, cross, main, $$scope, slots];
}

class Flex extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$f, create_fragment$f, safe_not_equal, {
			direction: 1,
			pad: 2,
			gap: 3,
			cross: 4,
			main: 5
		});
	}
}

/* node_modules\@axel669\zephyr\src\paper.svelte generated by Svelte v3.58.0 */
const get_footer_slot_changes = dirty => ({});
const get_footer_slot_context = ctx => ({});
const get_content_slot_changes = dirty => ({});
const get_content_slot_context = ctx => ({ slot: "content" });
const get_header_slot_changes = dirty => ({});
const get_header_slot_context = ctx => ({});

// (108:4) {:else}
function create_else_block(ctx) {
	let switch_instance;
	let switch_instance_anchor;
	let current;
	const switch_instance_spread_levels = [/*props*/ ctx[2], { slot: "content" }];
	var switch_value = /*layout*/ ctx[0];

	function switch_props(ctx) {
		let switch_instance_props = {
			$$slots: { default: [create_default_slot$7] },
			$$scope: { ctx }
		};

		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
		}

		return { props: switch_instance_props };
	}

	if (switch_value) {
		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
	}

	return {
		c() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		m(target, anchor) {
			if (switch_instance) mount_component(switch_instance, target, anchor);
			insert(target, switch_instance_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const switch_instance_changes = (dirty & /*props*/ 4)
			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2]), switch_instance_spread_levels[1]])
			: {};

			if (dirty & /*$$scope*/ 1024) {
				switch_instance_changes.$$scope = { dirty, ctx };
			}

			if (dirty & /*layout*/ 1 && switch_value !== (switch_value = /*layout*/ ctx[0])) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};
}

// (106:4) {#if $$slots.content}
function create_if_block$4(ctx) {
	let current;
	const content_slot_template = /*#slots*/ ctx[9].content;
	const content_slot = create_slot(content_slot_template, ctx, /*$$scope*/ ctx[10], get_content_slot_context);

	return {
		c() {
			if (content_slot) content_slot.c();
		},
		m(target, anchor) {
			if (content_slot) {
				content_slot.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (content_slot) {
				if (content_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
					update_slot_base(
						content_slot,
						content_slot_template,
						ctx,
						/*$$scope*/ ctx[10],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[10])
						: get_slot_changes(content_slot_template, /*$$scope*/ ctx[10], dirty, get_content_slot_changes),
						get_content_slot_context
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(content_slot, local);
			current = true;
		},
		o(local) {
			transition_out(content_slot, local);
			current = false;
		},
		d(detaching) {
			if (content_slot) content_slot.d(detaching);
		}
	};
}

// (109:8) <svelte:component this={layout} {...props} slot="content">
function create_default_slot$7(ctx) {
	let current;
	const default_slot_template = /*#slots*/ ctx[9].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);

	return {
		c() {
			if (default_slot) default_slot.c();
		},
		m(target, anchor) {
			if (default_slot) {
				default_slot.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[10],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[10])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[10], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function create_fragment$e(ctx) {
	let ws_paper;
	let t0;
	let current_block_type_index;
	let if_block;
	let t1;
	let wsx_action;
	let current;
	let mounted;
	let dispose;
	const header_slot_template = /*#slots*/ ctx[9].header;
	const header_slot = create_slot(header_slot_template, ctx, /*$$scope*/ ctx[10], get_header_slot_context);
	const if_block_creators = [create_if_block$4, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*$$slots*/ ctx[3].content) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	const footer_slot_template = /*#slots*/ ctx[9].footer;
	const footer_slot = create_slot(footer_slot_template, ctx, /*$$scope*/ ctx[10], get_footer_slot_context);

	return {
		c() {
			ws_paper = element("ws-paper");
			if (header_slot) header_slot.c();
			t0 = space();
			if_block.c();
			t1 = space();
			if (footer_slot) footer_slot.c();
		},
		m(target, anchor) {
			insert(target, ws_paper, anchor);

			if (header_slot) {
				header_slot.m(ws_paper, null);
			}

			append(ws_paper, t0);
			if_blocks[current_block_type_index].m(ws_paper, null);
			append(ws_paper, t1);

			if (footer_slot) {
				footer_slot.m(ws_paper, null);
			}

			current = true;

			if (!mounted) {
				dispose = action_destroyer(wsx_action = wsx$1.call(null, ws_paper, /*wind*/ ctx[1]));
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (header_slot) {
				if (header_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
					update_slot_base(
						header_slot,
						header_slot_template,
						ctx,
						/*$$scope*/ ctx[10],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[10])
						: get_slot_changes(header_slot_template, /*$$scope*/ ctx[10], dirty, get_header_slot_changes),
						get_header_slot_context
					);
				}
			}

			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(ws_paper, t1);
			}

			if (footer_slot) {
				if (footer_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
					update_slot_base(
						footer_slot,
						footer_slot_template,
						ctx,
						/*$$scope*/ ctx[10],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[10])
						: get_slot_changes(footer_slot_template, /*$$scope*/ ctx[10], dirty, get_footer_slot_changes),
						get_footer_slot_context
					);
				}
			}

			if (wsx_action && is_function(wsx_action.update) && dirty & /*wind*/ 2) wsx_action.update.call(null, /*wind*/ ctx[1]);
		},
		i(local) {
			if (current) return;
			transition_in(header_slot, local);
			transition_in(if_block);
			transition_in(footer_slot, local);
			current = true;
		},
		o(local) {
			transition_out(header_slot, local);
			transition_out(if_block);
			transition_out(footer_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(ws_paper);
			if (header_slot) header_slot.d(detaching);
			if_blocks[current_block_type_index].d();
			if (footer_slot) footer_slot.d(detaching);
			mounted = false;
			dispose();
		}
	};
}

function instance$e($$self, $$props, $$invalidate) {
	let props;
	let wind;
	const omit_props_names = ["color","card","square","layout","scrollable","lprops"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	const $$slots = compute_slots(slots);
	let { color } = $$props;
	let { card = false } = $$props;
	let { square = false } = $$props;
	let { layout = Flex } = $$props;
	let { scrollable = false } = $$props;
	let { lprops = {} } = $$props;

	$$self.$$set = $$new_props => {
		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
		$$invalidate(11, $$restProps = compute_rest_props($$props, omit_props_names));
		if ('color' in $$new_props) $$invalidate(4, color = $$new_props.color);
		if ('card' in $$new_props) $$invalidate(5, card = $$new_props.card);
		if ('square' in $$new_props) $$invalidate(6, square = $$new_props.square);
		if ('layout' in $$new_props) $$invalidate(0, layout = $$new_props.layout);
		if ('scrollable' in $$new_props) $$invalidate(7, scrollable = $$new_props.scrollable);
		if ('lprops' in $$new_props) $$invalidate(8, lprops = $$new_props.lprops);
		if ('$$scope' in $$new_props) $$invalidate(10, $$scope = $$new_props.$$scope);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*scrollable, lprops*/ 384) {
			$$invalidate(2, props = {
				over: scrollable ? "auto" : false,
				...lprops
			});
		}

		$$invalidate(1, wind = {
			$color: color,
			"@outline": card,
			r: square && "0px",
			...$$restProps
		});
	};

	return [
		layout,
		wind,
		props,
		$$slots,
		color,
		card,
		square,
		scrollable,
		lprops,
		slots,
		$$scope
	];
}

class Paper extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$e, create_fragment$e, safe_not_equal, {
			color: 4,
			card: 5,
			square: 6,
			layout: 0,
			scrollable: 7,
			lprops: 8
		});
	}
}

/* node_modules\@axel669\zephyr\src\grid.svelte generated by Svelte v3.58.0 */

function create_fragment$d(ctx) {
	let ws_grid;
	let wsx_action;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[9].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

	return {
		c() {
			ws_grid = element("ws-grid");
			if (default_slot) default_slot.c();
		},
		m(target, anchor) {
			insert(target, ws_grid, anchor);

			if (default_slot) {
				default_slot.m(ws_grid, null);
			}

			current = true;

			if (!mounted) {
				dispose = action_destroyer(wsx_action = wsx$1.call(null, ws_grid, /*wind*/ ctx[0]));
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[8],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[8])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[8], dirty, null),
						null
					);
				}
			}

			if (wsx_action && is_function(wsx_action.update) && dirty & /*wind*/ 1) wsx_action.update.call(null, /*wind*/ ctx[0]);
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(ws_grid);
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			dispose();
		}
	};
}

function instance$d($$self, $$props, $$invalidate) {
	let wind;
	const omit_props_names = ["direction","pad","gap","cols","rows","autoCol","autoRow"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	let { direction = false } = $$props;
	let { pad = false } = $$props;
	let { gap = false } = $$props;
	let { cols = null } = $$props;
	let { rows = null } = $$props;
	let { autoCol = false } = $$props;
	let { autoRow = false } = $$props;

	$$self.$$set = $$new_props => {
		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
		$$invalidate(10, $$restProps = compute_rest_props($$props, omit_props_names));
		if ('direction' in $$new_props) $$invalidate(1, direction = $$new_props.direction);
		if ('pad' in $$new_props) $$invalidate(2, pad = $$new_props.pad);
		if ('gap' in $$new_props) $$invalidate(3, gap = $$new_props.gap);
		if ('cols' in $$new_props) $$invalidate(4, cols = $$new_props.cols);
		if ('rows' in $$new_props) $$invalidate(5, rows = $$new_props.rows);
		if ('autoCol' in $$new_props) $$invalidate(6, autoCol = $$new_props.autoCol);
		if ('autoRow' in $$new_props) $$invalidate(7, autoRow = $$new_props.autoRow);
		if ('$$scope' in $$new_props) $$invalidate(8, $$scope = $$new_props.$$scope);
	};

	$$self.$$.update = () => {
		$$invalidate(0, wind = {
			"gr-dir": direction,
			"gr-col": cols?.join?.(" ") ?? cols ?? false,
			"gr-row": rows?.join?.(" ") ?? rows ?? false,
			"gr-acol": autoCol,
			"gr-arow": autoRow,
			p: pad,
			gap,
			...$$restProps
		});
	};

	return [wind, direction, pad, gap, cols, rows, autoCol, autoRow, $$scope, slots];
}

class Grid extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$d, create_fragment$d, safe_not_equal, {
			direction: 1,
			pad: 2,
			gap: 3,
			cols: 4,
			rows: 5,
			autoCol: 6,
			autoRow: 7
		});
	}
}

/* node_modules\@axel669\zephyr\src\icon.svelte generated by Svelte v3.58.0 */

function create_fragment$c(ctx) {
	let ws_icon;
	let ws_icon_class_value;
	let wsx_action;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[3].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

	return {
		c() {
			ws_icon = element("ws-icon");
			if (default_slot) default_slot.c();
			set_custom_element_data(ws_icon, "class", ws_icon_class_value = "ti-" + /*name*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, ws_icon, anchor);

			if (default_slot) {
				default_slot.m(ws_icon, null);
			}

			current = true;

			if (!mounted) {
				dispose = action_destroyer(wsx_action = wsx$1.call(null, ws_icon, /*$$restProps*/ ctx[1]));
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[2],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null),
						null
					);
				}
			}

			if (!current || dirty & /*name*/ 1 && ws_icon_class_value !== (ws_icon_class_value = "ti-" + /*name*/ ctx[0])) {
				set_custom_element_data(ws_icon, "class", ws_icon_class_value);
			}

			if (wsx_action && is_function(wsx_action.update) && dirty & /*$$restProps*/ 2) wsx_action.update.call(null, /*$$restProps*/ ctx[1]);
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(ws_icon);
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			dispose();
		}
	};
}

function instance$c($$self, $$props, $$invalidate) {
	const omit_props_names = ["name"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	let { name } = $$props;

	$$self.$$set = $$new_props => {
		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
		$$invalidate(1, $$restProps = compute_rest_props($$props, omit_props_names));
		if ('name' in $$new_props) $$invalidate(0, name = $$new_props.name);
		if ('$$scope' in $$new_props) $$invalidate(2, $$scope = $$new_props.$$scope);
	};

	return [name, $$restProps, $$scope, slots];
}

class Icon extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$c, create_fragment$c, safe_not_equal, { name: 0 });
	}
}

/* node_modules\@axel669\zephyr\src\modal.svelte generated by Svelte v3.58.0 */

function create_if_block$3(ctx) {
	let ws_modal;
	let switch_instance;
	let current;
	let mounted;
	let dispose;
	const switch_instance_spread_levels = [/*modalProps*/ ctx[1], { close: /*close*/ ctx[4] }];
	var switch_value = /*component*/ ctx[0];

	function switch_props(ctx) {
		let switch_instance_props = {};

		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
		}

		return { props: switch_instance_props };
	}

	if (switch_value) {
		switch_instance = construct_svelte_component(switch_value, switch_props());
		/*switch_instance_binding*/ ctx[7](switch_instance);
	}

	return {
		c() {
			ws_modal = element("ws-modal");
			if (switch_instance) create_component(switch_instance.$$.fragment);
			set_custom_element_data(ws_modal, "ws-x", "$show");
		},
		m(target, anchor) {
			insert(target, ws_modal, anchor);
			if (switch_instance) mount_component(switch_instance, ws_modal, null);
			current = true;

			if (!mounted) {
				dispose = listen(ws_modal, "click", /*cancel*/ ctx[5]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			const switch_instance_changes = (dirty & /*modalProps, close*/ 18)
			? get_spread_update(switch_instance_spread_levels, [
					dirty & /*modalProps*/ 2 && get_spread_object(/*modalProps*/ ctx[1]),
					dirty & /*close*/ 16 && { close: /*close*/ ctx[4] }
				])
			: {};

			if (dirty & /*component*/ 1 && switch_value !== (switch_value = /*component*/ ctx[0])) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = construct_svelte_component(switch_value, switch_props());
					/*switch_instance_binding*/ ctx[7](switch_instance);
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, ws_modal, null);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(ws_modal);
			/*switch_instance_binding*/ ctx[7](null);
			if (switch_instance) destroy_component(switch_instance);
			mounted = false;
			dispose();
		}
	};
}

function create_fragment$b(ctx) {
	let if_block_anchor;
	let current;
	let if_block = /*resolver*/ ctx[2] !== null && create_if_block$3(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (/*resolver*/ ctx[2] !== null) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*resolver*/ 4) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$3(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$b($$self, $$props, $$invalidate) {
	let { component } = $$props;
	let modalProps = null;
	let resolver = null;
	let displayed = null;

	const close = value => {
		resolver(value);
		$$invalidate(2, resolver = null);
		$$invalidate(1, modalProps = null);
	};

	const cancel = () => displayed.cancel?.();

	const show = props => new Promise(resolve => {
			$$invalidate(1, modalProps = props ?? {});
			$$invalidate(2, resolver = resolve);
		});

	function switch_instance_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			displayed = $$value;
			$$invalidate(3, displayed);
		});
	}

	$$self.$$set = $$props => {
		if ('component' in $$props) $$invalidate(0, component = $$props.component);
	};

	return [
		component,
		modalProps,
		resolver,
		displayed,
		close,
		cancel,
		show,
		switch_instance_binding
	];
}

class Modal extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$b, create_fragment$b, safe_not_equal, { component: 0, show: 6 });
	}

	get show() {
		return this.$$.ctx[6];
	}
}

// let crypto = null
const crypto$1 =
    (typeof window !== "undefined")
    ? window.crypto
    : (await import('node:crypto')).default;

const offset = BigInt(8640000000000000);
const maxValid = offset * 2n;
const intBytes = (bytes) => (
    (bytes[0] * 4294967296)
    + (bytes[1] * 16777216)
    + (bytes[2] * 65536)
    + (bytes[3] * 256)
    + (bytes[4])
);
const base32 = (bytes) =>
    intBytes(bytes)
    .toString(32)
    .padStart(8, "0");
const formatBytes = (bytes) => {
    const a = base32(bytes.slice(0, 5));
    const b = base32(bytes.slice(5, 10));
    const c = base32(bytes.slice(10));

    return `${a}${b}${c}`
};
const idRegex = /^[a-v0-9]{15}$/;
const genID = (id) => {
    if (typeof id === "string" && idRegex.test(id) === true) {
        return id
    }
    if (id?.constructor === Uint8Array && id.length === 15) {
        return formatBytes(id)
    }
    const randomID = new Uint8Array(15);
    crypto$1.getRandomValues(randomID);
    return formatBytes(randomID)
};
const genTime = (time) => {
    const source = (time ?? Date.now()).valueOf();
    const valid = (
        source.constructor === BigInt
        || (
            source.constructor === Number
            && isNaN(source) === false
        )
    );
    if (valid === false) {
        return { error: "Invalid timestamp" }
    }
    const timestamp = BigInt(source) + offset;

    if (timestamp < 0n || timestamp > maxValid) {
        return { error: "timestamp out of valid range" }
    }

    return timestamp.toString(32).padStart(11, "0")
};
const asuid = (time = null, id = null) => {
    const timePart = genTime(time);
    const idPart = genID(id);

    if (timePart.error !== undefined) {
        return { error: [timePart.error] }
    }

    return `${timePart}${idPart}`
};

const alphabet = "0123456789abcdefghijklmnopqrstuv";
const alphaMap = [...alphabet].reduce(
    (map, ch, index) => {
        map[ch] = BigInt(index);
        return map
    },
    {}
);
const parse32 = (str) => {
    let value = 0n;
    for (let i = 0; i < 11; i += 1) {
        value = (value * 32n) + alphaMap[str.charAt(i)];
    }
    return value
};
const parse$1 = (asuid) => {
    const time = Number(
        parse32(asuid) - offset
    );

    return {
        time,
        date: new Date(time),
        id: asuid.slice(11),
        source: asuid
    }
};

asuid.parse = parse$1;

/*md
[@] Event Handlers

# Event Handlers

Zephyr provides a couple of functions to help make event handlers look
nicer and bind arguments easier.
*/


/*md
## handler$

Wraps a function for currying as an event handler. The curried function does
not pass the event into final function call.

### Usage
```js
const clicked = handler$(
    (buttonName) => console.log(buttonName)
)
```
```svelte
<!-- logs "first" when clicked -->
<Button on:click={clicked("first")}>
    First
</Button>
<!-- logs "second" when clicked -->
<Button on:click={clicked("second")}>
    Second
</Button>
```
*/
const handler$ = (func) =>
    (...args) =>
        (_, ...extra) => func(...args, ...extra);

/*md
## eventHandler$

Wraps a function for currying as an event handler. Unlike the `handler$`
function, the event is passed to the curried function.

### Usage
In the following example, "first" is logged each time the first button is
clicked, and "second" is logged when the second button is clicked. In both
cases the click event is also logged.
```js
const clicked = eventHandler$(
    (event, buttonName) => console.log(event, buttonName)
)
```
```svelte
<!-- logs the event and "first" when clicked -->
<Button on:click={clicked("first")}>
    First
</Button>
<!-- logs the event and "second" when clicked -->
<Button on:click={clicked("second")}>
    Second
</Button>
```
*/
const eventHandler$ = (func) =>
    (...args) =>
        (...extra) => func(...extra, ...args);

/* node_modules\@axel669\zephyr\src\screen.svelte generated by Svelte v3.58.0 */

function create_fragment$a(ctx) {
	let ws_screen;
	let wsx_action;
	let ws_screen_transition;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[4].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

	return {
		c() {
			ws_screen = element("ws-screen");
			if (default_slot) default_slot.c();
		},
		m(target, anchor) {
			insert(target, ws_screen, anchor);

			if (default_slot) {
				default_slot.m(ws_screen, null);
			}

			current = true;

			if (!mounted) {
				dispose = action_destroyer(wsx_action = wsx$1.call(null, ws_screen, /*wind*/ ctx[0]));
				mounted = true;
			}
		},
		p(new_ctx, [dirty]) {
			ctx = new_ctx;

			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[3],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
						null
					);
				}
			}

			if (wsx_action && is_function(wsx_action.update) && dirty & /*wind*/ 1) wsx_action.update.call(null, /*wind*/ ctx[0]);
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);

			add_render_callback(() => {
				if (!current) return;
				if (!ws_screen_transition) ws_screen_transition = create_bidirectional_transition(ws_screen, fly, /*animation*/ ctx[1], true);
				ws_screen_transition.run(1);
			});

			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			if (!ws_screen_transition) ws_screen_transition = create_bidirectional_transition(ws_screen, fly, /*animation*/ ctx[1], false);
			ws_screen_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(ws_screen);
			if (default_slot) default_slot.d(detaching);
			if (detaching && ws_screen_transition) ws_screen_transition.end();
			mounted = false;
			dispose();
		}
	};
}

const ctxStack = Symbol("stack context");

function instance$a($$self, $$props, $$invalidate) {
	let wind;
	const omit_props_names = ["width"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	let { width = false } = $$props;
	const stack = getContext(ctxStack) ?? 0;
	const animation = { y: window.innerHeight, duration: 350 };
	setContext(ctxStack, stack + 1);

	$$self.$$set = $$new_props => {
		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
		$$invalidate(6, $$restProps = compute_rest_props($$props, omit_props_names));
		if ('width' in $$new_props) $$invalidate(2, width = $$new_props.width);
		if ('$$scope' in $$new_props) $$invalidate(3, $$scope = $$new_props.$$scope);
	};

	$$self.$$.update = () => {
		$$invalidate(0, wind = {
			"&stack": stack.toString(),
			"&screen-width": width,
			"bg-c": "transparent",
			...$$restProps
		});
	};

	return [wind, animation, width, $$scope, slots];
}

class Screen extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$a, create_fragment$a, safe_not_equal, { width: 2 });
	}
}

/* node_modules\@axel669\zephyr\src\text.svelte generated by Svelte v3.58.0 */

function create_fragment$9(ctx) {
	let span;
	let wsx_action;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[6].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

	return {
		c() {
			span = element("span");
			if (default_slot) default_slot.c();
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (default_slot) {
				default_slot.m(span, null);
			}

			current = true;

			if (!mounted) {
				dispose = action_destroyer(wsx_action = wsx$1.call(null, span, /*wind*/ ctx[0]));
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[5],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
						null
					);
				}
			}

			if (wsx_action && is_function(wsx_action.update) && dirty & /*wind*/ 1) wsx_action.update.call(null, /*wind*/ ctx[0]);
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			dispose();
		}
	};
}

function instance$9($$self, $$props, $$invalidate) {
	let wind;
	const omit_props_names = ["title","subtitle","block","adorn"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	let { title = false } = $$props;
	let { subtitle = false } = $$props;
	let { block = false } = $$props;
	let { adorn = false } = $$props;

	$$self.$$set = $$new_props => {
		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
		$$invalidate(7, $$restProps = compute_rest_props($$props, omit_props_names));
		if ('title' in $$new_props) $$invalidate(1, title = $$new_props.title);
		if ('subtitle' in $$new_props) $$invalidate(2, subtitle = $$new_props.subtitle);
		if ('block' in $$new_props) $$invalidate(3, block = $$new_props.block);
		if ('adorn' in $$new_props) $$invalidate(4, adorn = $$new_props.adorn);
		if ('$$scope' in $$new_props) $$invalidate(5, $$scope = $$new_props.$$scope);
	};

	$$self.$$.update = () => {
		$$invalidate(0, wind = {
			"$title": title,
			"$subtitle": subtitle,
			"$adorn": adorn,
			block,
			...$$restProps
		});
	};

	return [wind, title, subtitle, block, adorn, $$scope, slots];
}

let Text$1 = class Text extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$9, create_fragment$9, safe_not_equal, {
			title: 1,
			subtitle: 2,
			block: 3,
			adorn: 4
		});
	}
};

/* node_modules\@axel669\zephyr\src\titlebar.svelte generated by Svelte v3.58.0 */
const get_action_slot_changes = dirty => ({});
const get_action_slot_context = ctx => ({});
const get_title_slot_changes = dirty => ({});
const get_title_slot_context = ctx => ({});
const get_menu_slot_changes = dirty => ({});
const get_menu_slot_context = ctx => ({});

function create_fragment$8(ctx) {
	let ws_titlebar;
	let t0;
	let t1;
	let wsx_action;
	let current;
	let mounted;
	let dispose;
	const menu_slot_template = /*#slots*/ ctx[4].menu;
	const menu_slot = create_slot(menu_slot_template, ctx, /*$$scope*/ ctx[3], get_menu_slot_context);
	const title_slot_template = /*#slots*/ ctx[4].title;
	const title_slot = create_slot(title_slot_template, ctx, /*$$scope*/ ctx[3], get_title_slot_context);
	const action_slot_template = /*#slots*/ ctx[4].action;
	const action_slot = create_slot(action_slot_template, ctx, /*$$scope*/ ctx[3], get_action_slot_context);

	return {
		c() {
			ws_titlebar = element("ws-titlebar");
			if (menu_slot) menu_slot.c();
			t0 = space();
			if (title_slot) title_slot.c();
			t1 = space();
			if (action_slot) action_slot.c();
		},
		m(target, anchor) {
			insert(target, ws_titlebar, anchor);

			if (menu_slot) {
				menu_slot.m(ws_titlebar, null);
			}

			append(ws_titlebar, t0);

			if (title_slot) {
				title_slot.m(ws_titlebar, null);
			}

			append(ws_titlebar, t1);

			if (action_slot) {
				action_slot.m(ws_titlebar, null);
			}

			current = true;

			if (!mounted) {
				dispose = action_destroyer(wsx_action = wsx$1.call(null, ws_titlebar, /*wind*/ ctx[0]));
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (menu_slot) {
				if (menu_slot.p && (!current || dirty & /*$$scope*/ 8)) {
					update_slot_base(
						menu_slot,
						menu_slot_template,
						ctx,
						/*$$scope*/ ctx[3],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
						: get_slot_changes(menu_slot_template, /*$$scope*/ ctx[3], dirty, get_menu_slot_changes),
						get_menu_slot_context
					);
				}
			}

			if (title_slot) {
				if (title_slot.p && (!current || dirty & /*$$scope*/ 8)) {
					update_slot_base(
						title_slot,
						title_slot_template,
						ctx,
						/*$$scope*/ ctx[3],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
						: get_slot_changes(title_slot_template, /*$$scope*/ ctx[3], dirty, get_title_slot_changes),
						get_title_slot_context
					);
				}
			}

			if (action_slot) {
				if (action_slot.p && (!current || dirty & /*$$scope*/ 8)) {
					update_slot_base(
						action_slot,
						action_slot_template,
						ctx,
						/*$$scope*/ ctx[3],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
						: get_slot_changes(action_slot_template, /*$$scope*/ ctx[3], dirty, get_action_slot_changes),
						get_action_slot_context
					);
				}
			}

			if (wsx_action && is_function(wsx_action.update) && dirty & /*wind*/ 1) wsx_action.update.call(null, /*wind*/ ctx[0]);
		},
		i(local) {
			if (current) return;
			transition_in(menu_slot, local);
			transition_in(title_slot, local);
			transition_in(action_slot, local);
			current = true;
		},
		o(local) {
			transition_out(menu_slot, local);
			transition_out(title_slot, local);
			transition_out(action_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(ws_titlebar);
			if (menu_slot) menu_slot.d(detaching);
			if (title_slot) title_slot.d(detaching);
			if (action_slot) action_slot.d(detaching);
			mounted = false;
			dispose();
		}
	};
}

function instance$8($$self, $$props, $$invalidate) {
	let wind;
	const omit_props_names = ["color","fill"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	let { color } = $$props;
	let { fill = false } = $$props;

	$$self.$$set = $$new_props => {
		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
		$$invalidate(5, $$restProps = compute_rest_props($$props, omit_props_names));
		if ('color' in $$new_props) $$invalidate(1, color = $$new_props.color);
		if ('fill' in $$new_props) $$invalidate(2, fill = $$new_props.fill);
		if ('$$scope' in $$new_props) $$invalidate(3, $$scope = $$new_props.$$scope);
	};

	$$self.$$.update = () => {
		$$invalidate(0, wind = {
			$color: color,
			"@fill": fill,
			...$$restProps
		});
	};

	return [wind, color, fill, $$scope, slots];
}

class Titlebar extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$8, create_fragment$8, safe_not_equal, { color: 1, fill: 2 });
	}
}

/* node_modules\@axel669\zephyr\src\composed\entry-button.svelte generated by Svelte v3.58.0 */

function create_default_slot$6(ctx) {
	let current;
	const default_slot_template = /*#slots*/ ctx[6].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

	return {
		c() {
			if (default_slot) default_slot.c();
		},
		m(target, anchor) {
			if (default_slot) {
				default_slot.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[8],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[8])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[8], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function create_fragment$7(ctx) {
	let button;
	let t;
	let switch_instance;
	let switch_instance_anchor;
	let current;
	const button_spread_levels = [/*$$restProps*/ ctx[5]];

	let button_props = {
		$$slots: { default: [create_default_slot$6] },
		$$scope: { ctx }
	};

	for (let i = 0; i < button_spread_levels.length; i += 1) {
		button_props = assign(button_props, button_spread_levels[i]);
	}

	button = new Button({ props: button_props });

	button.$on("click", function () {
		if (is_function(/*open*/ ctx[4](/*props*/ ctx[1]))) /*open*/ ctx[4](/*props*/ ctx[1]).apply(this, arguments);
	});

	var switch_value = /*wrapper*/ ctx[2];

	function switch_props(ctx) {
		let switch_instance_props = { component: /*component*/ ctx[0] };
		return { props: switch_instance_props };
	}

	if (switch_value) {
		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
		/*switch_instance_binding*/ ctx[7](switch_instance);
	}

	return {
		c() {
			create_component(button.$$.fragment);
			t = space();
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		m(target, anchor) {
			mount_component(button, target, anchor);
			insert(target, t, anchor);
			if (switch_instance) mount_component(switch_instance, target, anchor);
			insert(target, switch_instance_anchor, anchor);
			current = true;
		},
		p(new_ctx, [dirty]) {
			ctx = new_ctx;

			const button_changes = (dirty & /*$$restProps*/ 32)
			? get_spread_update(button_spread_levels, [get_spread_object(/*$$restProps*/ ctx[5])])
			: {};

			if (dirty & /*$$scope*/ 256) {
				button_changes.$$scope = { dirty, ctx };
			}

			button.$set(button_changes);
			const switch_instance_changes = {};
			if (dirty & /*component*/ 1) switch_instance_changes.component = /*component*/ ctx[0];

			if (dirty & /*wrapper*/ 4 && switch_value !== (switch_value = /*wrapper*/ ctx[2])) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
					/*switch_instance_binding*/ ctx[7](switch_instance);
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i(local) {
			if (current) return;
			transition_in(button.$$.fragment, local);
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(button.$$.fragment, local);
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(button, detaching);
			if (detaching) detach(t);
			/*switch_instance_binding*/ ctx[7](null);
			if (detaching) detach(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};
}

function instance$7($$self, $$props, $$invalidate) {
	const omit_props_names = ["component","props","this"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	let { component } = $$props;
	let { props } = $$props;
	let { this: wrapper = Modal } = $$props;
	const send = createEventDispatcher();
	let element = null;

	const open = handler$(async props => {
		const elemProps = typeof props === "function" ? props() : props;
		const result = await element.show(elemProps);
		send("entry", result);
	});

	function switch_instance_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			element = $$value;
			$$invalidate(3, element);
		});
	}

	$$self.$$set = $$new_props => {
		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
		$$invalidate(5, $$restProps = compute_rest_props($$props, omit_props_names));
		if ('component' in $$new_props) $$invalidate(0, component = $$new_props.component);
		if ('props' in $$new_props) $$invalidate(1, props = $$new_props.props);
		if ('this' in $$new_props) $$invalidate(2, wrapper = $$new_props.this);
		if ('$$scope' in $$new_props) $$invalidate(8, $$scope = $$new_props.$$scope);
	};

	return [
		component,
		props,
		wrapper,
		element,
		open,
		$$restProps,
		slots,
		switch_instance_binding,
		$$scope
	];
}

class Entry_button extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$7, create_fragment$7, safe_not_equal, { component: 0, props: 1, this: 2 });
	}
}

/* node_modules\@axel669\zephyr\src\input\text.svelte generated by Svelte v3.58.0 */
const get_end_slot_changes = dirty => ({});
const get_end_slot_context = ctx => ({});
const get_start_slot_changes = dirty => ({});
const get_start_slot_context = ctx => ({});

// (90:4) {#if label}
function create_if_block$2(ctx) {
	let span;
	let t;

	return {
		c() {
			span = element("span");
			t = text(/*label*/ ctx[1]);
			attr(span, "ws-x", "$text");
			attr(span, "ws-hint", /*hint*/ ctx[3]);
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t);
		},
		p(ctx, dirty) {
			if (dirty & /*label*/ 2) set_data(t, /*label*/ ctx[1]);

			if (dirty & /*hint*/ 8) {
				attr(span, "ws-hint", /*hint*/ ctx[3]);
			}
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

function create_fragment$6(ctx) {
	let label_1;
	let t0;
	let input_1;
	let t1;
	let t2;
	let wsx_action;
	let current;
	let mounted;
	let dispose;
	let if_block = /*label*/ ctx[1] && create_if_block$2(ctx);
	let input_1_levels = [/*$$restProps*/ ctx[7], { type: "text" }, { disabled: /*disabled*/ ctx[4] }];
	let input_data = {};

	for (let i = 0; i < input_1_levels.length; i += 1) {
		input_data = assign(input_data, input_1_levels[i]);
	}

	const start_slot_template = /*#slots*/ ctx[16].start;
	const start_slot = create_slot(start_slot_template, ctx, /*$$scope*/ ctx[15], get_start_slot_context);
	const end_slot_template = /*#slots*/ ctx[16].end;
	const end_slot = create_slot(end_slot_template, ctx, /*$$scope*/ ctx[15], get_end_slot_context);

	return {
		c() {
			label_1 = element("label");
			if (if_block) if_block.c();
			t0 = space();
			input_1 = element("input");
			t1 = space();
			if (start_slot) start_slot.c();
			t2 = space();
			if (end_slot) end_slot.c();
			set_attributes(input_1, input_data);
			attr(label_1, "ws-error", /*error*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, label_1, anchor);
			if (if_block) if_block.m(label_1, null);
			append(label_1, t0);
			append(label_1, input_1);
			if (input_1.autofocus) input_1.focus();
			set_input_value(input_1, /*value*/ ctx[0]);
			/*input_1_binding*/ ctx[20](input_1);
			append(label_1, t1);

			if (start_slot) {
				start_slot.m(label_1, null);
			}

			append(label_1, t2);

			if (end_slot) {
				end_slot.m(label_1, null);
			}

			current = true;

			if (!mounted) {
				dispose = [
					listen(input_1, "input", /*input_1_input_handler*/ ctx[19]),
					listen(input_1, "focus", /*focus_handler*/ ctx[17]),
					listen(input_1, "blur", /*blur_handler*/ ctx[18]),
					action_destroyer(wsx_action = wsx$1.call(null, label_1, /*wind*/ ctx[6]))
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (/*label*/ ctx[1]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block$2(ctx);
					if_block.c();
					if_block.m(label_1, t0);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			set_attributes(input_1, input_data = get_spread_update(input_1_levels, [
				dirty & /*$$restProps*/ 128 && /*$$restProps*/ ctx[7],
				{ type: "text" },
				(!current || dirty & /*disabled*/ 16) && { disabled: /*disabled*/ ctx[4] }
			]));

			if (dirty & /*value*/ 1 && input_1.value !== /*value*/ ctx[0]) {
				set_input_value(input_1, /*value*/ ctx[0]);
			}

			if (start_slot) {
				if (start_slot.p && (!current || dirty & /*$$scope*/ 32768)) {
					update_slot_base(
						start_slot,
						start_slot_template,
						ctx,
						/*$$scope*/ ctx[15],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
						: get_slot_changes(start_slot_template, /*$$scope*/ ctx[15], dirty, get_start_slot_changes),
						get_start_slot_context
					);
				}
			}

			if (end_slot) {
				if (end_slot.p && (!current || dirty & /*$$scope*/ 32768)) {
					update_slot_base(
						end_slot,
						end_slot_template,
						ctx,
						/*$$scope*/ ctx[15],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
						: get_slot_changes(end_slot_template, /*$$scope*/ ctx[15], dirty, get_end_slot_changes),
						get_end_slot_context
					);
				}
			}

			if (!current || dirty & /*error*/ 4) {
				attr(label_1, "ws-error", /*error*/ ctx[2]);
			}

			if (wsx_action && is_function(wsx_action.update) && dirty & /*wind*/ 64) wsx_action.update.call(null, /*wind*/ ctx[6]);
		},
		i(local) {
			if (current) return;
			transition_in(start_slot, local);
			transition_in(end_slot, local);
			current = true;
		},
		o(local) {
			transition_out(start_slot, local);
			transition_out(end_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(label_1);
			if (if_block) if_block.d();
			/*input_1_binding*/ ctx[20](null);
			if (start_slot) start_slot.d(detaching);
			if (end_slot) end_slot.d(detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$6($$self, $$props, $$invalidate) {
	let wind;

	const omit_props_names = [
		"flat","label","color","error","hint","disabled","value","transform","tvalue","validate","valid","focus"
	];

	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	let { flat = false } = $$props;
	let { label } = $$props;
	let { color = "default" } = $$props;
	let { error = null } = $$props;
	let { hint = null } = $$props;
	let { disabled } = $$props;
	let { value = "" } = $$props;
	let { transform = i => i } = $$props;
	let { tvalue } = $$props;
	let { validate = () => true } = $$props;
	let { valid } = $$props;
	let input = null;
	const focus = () => input.focus();

	function focus_handler(event) {
		bubble.call(this, $$self, event);
	}

	function blur_handler(event) {
		bubble.call(this, $$self, event);
	}

	function input_1_input_handler() {
		value = this.value;
		$$invalidate(0, value);
	}

	function input_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			input = $$value;
			$$invalidate(5, input);
		});
	}

	$$self.$$set = $$new_props => {
		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
		$$invalidate(7, $$restProps = compute_rest_props($$props, omit_props_names));
		if ('flat' in $$new_props) $$invalidate(10, flat = $$new_props.flat);
		if ('label' in $$new_props) $$invalidate(1, label = $$new_props.label);
		if ('color' in $$new_props) $$invalidate(11, color = $$new_props.color);
		if ('error' in $$new_props) $$invalidate(2, error = $$new_props.error);
		if ('hint' in $$new_props) $$invalidate(3, hint = $$new_props.hint);
		if ('disabled' in $$new_props) $$invalidate(4, disabled = $$new_props.disabled);
		if ('value' in $$new_props) $$invalidate(0, value = $$new_props.value);
		if ('transform' in $$new_props) $$invalidate(12, transform = $$new_props.transform);
		if ('tvalue' in $$new_props) $$invalidate(8, tvalue = $$new_props.tvalue);
		if ('validate' in $$new_props) $$invalidate(13, validate = $$new_props.validate);
		if ('valid' in $$new_props) $$invalidate(9, valid = $$new_props.valid);
		if ('$$scope' in $$new_props) $$invalidate(15, $$scope = $$new_props.$$scope);
	};

	$$self.$$.update = () => {
		$$invalidate(6, wind = {
			"@flat": flat,
			"@control": true,
			$color: color,
			...$$restProps
		});

		if ($$self.$$.dirty & /*transform, value*/ 4097) {
			$$invalidate(8, tvalue = transform(value ?? ""));
		}

		if ($$self.$$.dirty & /*validate, tvalue*/ 8448) {
			$$invalidate(9, valid = validate(tvalue));
		}
	};

	return [
		value,
		label,
		error,
		hint,
		disabled,
		input,
		wind,
		$$restProps,
		tvalue,
		valid,
		flat,
		color,
		transform,
		validate,
		focus,
		$$scope,
		slots,
		focus_handler,
		blur_handler,
		input_1_input_handler,
		input_1_binding
	];
}

class Text extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
			flat: 10,
			label: 1,
			color: 11,
			error: 2,
			hint: 3,
			disabled: 4,
			value: 0,
			transform: 12,
			tvalue: 8,
			validate: 13,
			valid: 9,
			focus: 14
		});
	}

	get focus() {
		return this.$$.ctx[14];
	}
}

const randResult = new Uint32Array(1);
const rand = (sides) => {
    crypto.getRandomValues(randResult);
    const rand = randResult[0] / 0xffffffff;
    const roll = Math.floor(rand * sides) + 1;

    return roll
};

const subscriber_queue = [];
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = new Set();
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (const subscriber of subscribers) {
                    subscriber[1]();
                    subscriber_queue.push(subscriber, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.add(subscriber);
        if (subscribers.size === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            subscribers.delete(subscriber);
            if (subscribers.size === 0 && stop) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}

const source = writable([]);

let i = 0;
var rolls = {
    subscribe: source.subscribe,
    add: (info) => source.update(
        (list) => {
            i = 1 - i;
            return [
                { ...info, i },
                ...list.slice(0, 99)
            ]
        }
    ),
    clear: () => source.set([])
};

const diceRegex = /(?<num>\d+)?d(?<sides>\d+)(\((?<type>\w+)\))?(\[(?<mods>[a-z]+)\])?|(?<value>\d+)(\((?<valuetype>\w+)\))?/g;
const parse = (rolls) => Array.from(
    rolls.matchAll(diceRegex),
    (match) => ({
        value: parseInt(match.groups.value ?? "-1"),
        num: parseInt(match.groups.num ?? "1"),
        sides: parseInt(match.groups.sides ?? "-1"),
        type: match.groups.type ?? "",
        valuetype: match.groups.valuetype ?? "",
        mods: match.groups.mods,
    })
);

const mods = {
    a: (values) => [Math.max(...values)],
    d: (values) => [Math.min(...values)],
};
const roller = (info) => {
    if (info.value !== -1) {
        return [info.value, info.valuetype]
    }

    const values = Array.from(
        { length: info.num },
        () => rand(info.sides)
    );

    const modified = [...(info.mods ?? "")].reduce(
        (values, mod) => mods[mod](values),
        values
    );

    const total = modified.reduce(
        (total, n) => total + n,
        0
    );

    return [total, info.type]
};

const add = (a = 0, b = 0) => a + b;
const roll = (dice) => {
    const rolls = parse(dice).map(
        (info) => roller(info)
    );

    const totals = rolls.reduce(
        (totals, roll) => {
            totals["?"] = add(totals["?"], roll[0]);
            totals[roll[1]] = add(totals[roll[1]], roll[0]);
            return totals
        },
        {}
    );
    const {
        "?": total,
        "": untyped,
        ...typed
    } = totals;

    return { rolls, total, untyped, typed: Object.entries(typed) }
};

/* src\comp\dice.svelte generated by Svelte v3.58.0 */

function create_default_slot_3$5(ctx) {
	let t_value = /*info*/ ctx[0].name + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*info*/ 1 && t_value !== (t_value = /*info*/ ctx[0].name + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (29:8) <Text subtitle>
function create_default_slot_2$5(ctx) {
	let t_value = /*info*/ ctx[0].dice + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*info*/ 1 && t_value !== (t_value = /*info*/ ctx[0].dice + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (27:4) <Flex cross="center" main="center">
function create_default_slot_1$5(ctx) {
	let text0;
	let t;
	let text1;
	let current;

	text0 = new Text$1({
			props: {
				$$slots: { default: [create_default_slot_3$5] },
				$$scope: { ctx }
			}
		});

	text1 = new Text$1({
			props: {
				subtitle: true,
				$$slots: { default: [create_default_slot_2$5] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(text0.$$.fragment);
			t = space();
			create_component(text1.$$.fragment);
		},
		m(target, anchor) {
			mount_component(text0, target, anchor);
			insert(target, t, anchor);
			mount_component(text1, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const text0_changes = {};

			if (dirty & /*$$scope, info*/ 5) {
				text0_changes.$$scope = { dirty, ctx };
			}

			text0.$set(text0_changes);
			const text1_changes = {};

			if (dirty & /*$$scope, info*/ 5) {
				text1_changes.$$scope = { dirty, ctx };
			}

			text1.$set(text1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(text0.$$.fragment, local);
			transition_in(text1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(text0.$$.fragment, local);
			transition_out(text1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(text0, detaching);
			if (detaching) detach(t);
			destroy_component(text1, detaching);
		}
	};
}

// (26:0) <Button variant="outline" color="primary" on:click={rollem()}>
function create_default_slot$5(ctx) {
	let flex;
	let current;

	flex = new Flex({
			props: {
				cross: "center",
				main: "center",
				$$slots: { default: [create_default_slot_1$5] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(flex.$$.fragment);
		},
		m(target, anchor) {
			mount_component(flex, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const flex_changes = {};

			if (dirty & /*$$scope, info*/ 5) {
				flex_changes.$$scope = { dirty, ctx };
			}

			flex.$set(flex_changes);
		},
		i(local) {
			if (current) return;
			transition_in(flex.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(flex.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(flex, detaching);
		}
	};
}

function create_fragment$5(ctx) {
	let button;
	let current;

	button = new Button({
			props: {
				variant: "outline",
				color: "primary",
				$$slots: { default: [create_default_slot$5] },
				$$scope: { ctx }
			}
		});

	button.$on("click", /*rollem*/ ctx[1]());

	return {
		c() {
			create_component(button.$$.fragment);
		},
		m(target, anchor) {
			mount_component(button, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const button_changes = {};

			if (dirty & /*$$scope, info*/ 5) {
				button_changes.$$scope = { dirty, ctx };
			}

			button.$set(button_changes);
		},
		i(local) {
			if (current) return;
			transition_in(button.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(button.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(button, detaching);
		}
	};
}

function instance$5($$self, $$props, $$invalidate) {
	let { info } = $$props;

	const rollem = handler$(() => rolls.add({
		name: info.name,
		dice: info.dice,
		...roll(info.dice)
	}));

	$$self.$$set = $$props => {
		if ('info' in $$props) $$invalidate(0, info = $$props.info);
	};

	return [info, rollem];
}

class Dice extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$5, create_fragment$5, safe_not_equal, { info: 0 });
	}
}

/* src\comp\result.svelte generated by Svelte v3.58.0 */

function get_each_context$3(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[2] = list[i][0];
	child_ctx[4] = i;
	return child_ctx;
}

function get_each_context_1$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[5] = list[i][0];
	child_ctx[2] = list[i][1];
	return child_ctx;
}

// (18:4) <Text t-a="center">
function create_default_slot_7$2(ctx) {
	let t_value = /*info*/ ctx[0].name + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*info*/ 1 && t_value !== (t_value = /*info*/ ctx[0].name + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (21:4) <Text title t-a="center">
function create_default_slot_6$4(ctx) {
	let t_value = /*info*/ ctx[0].total + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*info*/ 1 && t_value !== (t_value = /*info*/ ctx[0].total + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (28:8) <Text block>
function create_default_slot_5$4(ctx) {
	let t0;
	let t1_value = /*info*/ ctx[0].untyped + "";
	let t1;

	return {
		c() {
			t0 = text("untyped: ");
			t1 = text(t1_value);
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*info*/ 1 && t1_value !== (t1_value = /*info*/ ctx[0].untyped + "")) set_data(t1, t1_value);
		},
		d(detaching) {
			if (detaching) detach(t0);
			if (detaching) detach(t1);
		}
	};
}

// (32:12) <Text block>
function create_default_slot_4$4(ctx) {
	let t0_value = /*type*/ ctx[5] + "";
	let t0;
	let t1;
	let t2_value = /*dmg*/ ctx[2] + "";
	let t2;
	let t3;

	return {
		c() {
			t0 = text(t0_value);
			t1 = text(": ");
			t2 = text(t2_value);
			t3 = space();
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
			insert(target, t2, anchor);
			insert(target, t3, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*info*/ 1 && t0_value !== (t0_value = /*type*/ ctx[5] + "")) set_data(t0, t0_value);
			if (dirty & /*info*/ 1 && t2_value !== (t2_value = /*dmg*/ ctx[2] + "")) set_data(t2, t2_value);
		},
		d(detaching) {
			if (detaching) detach(t0);
			if (detaching) detach(t1);
			if (detaching) detach(t2);
			if (detaching) detach(t3);
		}
	};
}

// (31:8) {#each info.typed as [type, dmg]}
function create_each_block_1$1(ctx) {
	let text_1;
	let current;

	text_1 = new Text$1({
			props: {
				block: true,
				$$slots: { default: [create_default_slot_4$4] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(text_1.$$.fragment);
		},
		m(target, anchor) {
			mount_component(text_1, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const text_1_changes = {};

			if (dirty & /*$$scope, info*/ 257) {
				text_1_changes.$$scope = { dirty, ctx };
			}

			text_1.$set(text_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(text_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(text_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(text_1, detaching);
		}
	};
}

// (27:4) <Text t-sz="&text-size-info" col="3" row="1/3">
function create_default_slot_3$4(ctx) {
	let text_1;
	let t;
	let each_1_anchor;
	let current;

	text_1 = new Text$1({
			props: {
				block: true,
				$$slots: { default: [create_default_slot_5$4] },
				$$scope: { ctx }
			}
		});

	let each_value_1 = /*info*/ ctx[0].typed;
	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			create_component(text_1.$$.fragment);
			t = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			mount_component(text_1, target, anchor);
			insert(target, t, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(target, anchor);
				}
			}

			insert(target, each_1_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const text_1_changes = {};

			if (dirty & /*$$scope, info*/ 257) {
				text_1_changes.$$scope = { dirty, ctx };
			}

			text_1.$set(text_1_changes);

			if (dirty & /*info*/ 1) {
				each_value_1 = /*info*/ ctx[0].typed;
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block_1$1(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				group_outros();

				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(text_1.$$.fragment, local);

			for (let i = 0; i < each_value_1.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			transition_out(text_1.$$.fragment, local);
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			destroy_component(text_1, detaching);
			if (detaching) detach(t);
			destroy_each(each_blocks, detaching);
			if (detaching) detach(each_1_anchor);
		}
	};
}

// (38:4) <Text t-sz="&text-size-info">
function create_default_slot_2$4(ctx) {
	let t_value = /*info*/ ctx[0].dice + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*info*/ 1 && t_value !== (t_value = /*info*/ ctx[0].dice + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (43:12) {#if i != 0}
function create_if_block$1(ctx) {
	let t;

	return {
		c() {
			t = text("+");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (42:8) {#each info.rolls as [dmg], i}
function create_each_block$3(ctx) {
	let t0;
	let t1_value = /*dmg*/ ctx[2] + "";
	let t1;
	let if_block = /*i*/ ctx[4] != 0 && create_if_block$1();

	return {
		c() {
			if (if_block) if_block.c();
			t0 = space();
			t1 = text(t1_value);
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, t0, anchor);
			insert(target, t1, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*info*/ 1 && t1_value !== (t1_value = /*dmg*/ ctx[2] + "")) set_data(t1, t1_value);
		},
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(t0);
			if (detaching) detach(t1);
		}
	};
}

// (41:4) <Text t-sz="&text-size-info">
function create_default_slot_1$4(ctx) {
	let each_1_anchor;
	let each_value = /*info*/ ctx[0].rolls;
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
	}

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(target, anchor);
				}
			}

			insert(target, each_1_anchor, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*info*/ 1) {
				each_value = /*info*/ ctx[0].rolls;
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$3(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$3(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		d(detaching) {
			destroy_each(each_blocks, detaching);
			if (detaching) detach(each_1_anchor);
		}
	};
}

// (17:0) <Grid {cols} rows="1fr 1fr" bg={colors[info.i]} gr-flow="column">
function create_default_slot$4(ctx) {
	let text0;
	let t0;
	let text1;
	let t1;
	let div;
	let t2;
	let text2;
	let t3;
	let text3;
	let t4;
	let text4;
	let current;

	text0 = new Text$1({
			props: {
				"t-a": "center",
				$$slots: { default: [create_default_slot_7$2] },
				$$scope: { ctx }
			}
		});

	text1 = new Text$1({
			props: {
				title: true,
				"t-a": "center",
				$$slots: { default: [create_default_slot_6$4] },
				$$scope: { ctx }
			}
		});

	text2 = new Text$1({
			props: {
				"t-sz": "&text-size-info",
				col: "3",
				row: "1/3",
				$$slots: { default: [create_default_slot_3$4] },
				$$scope: { ctx }
			}
		});

	text3 = new Text$1({
			props: {
				"t-sz": "&text-size-info",
				$$slots: { default: [create_default_slot_2$4] },
				$$scope: { ctx }
			}
		});

	text4 = new Text$1({
			props: {
				"t-sz": "&text-size-info",
				$$slots: { default: [create_default_slot_1$4] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(text0.$$.fragment);
			t0 = space();
			create_component(text1.$$.fragment);
			t1 = space();
			div = element("div");
			t2 = space();
			create_component(text2.$$.fragment);
			t3 = space();
			create_component(text3.$$.fragment);
			t4 = space();
			create_component(text4.$$.fragment);
			attr(div, "ws-x", "col[2] row[1/3] bg[&primary] w[3px]");
		},
		m(target, anchor) {
			mount_component(text0, target, anchor);
			insert(target, t0, anchor);
			mount_component(text1, target, anchor);
			insert(target, t1, anchor);
			insert(target, div, anchor);
			insert(target, t2, anchor);
			mount_component(text2, target, anchor);
			insert(target, t3, anchor);
			mount_component(text3, target, anchor);
			insert(target, t4, anchor);
			mount_component(text4, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const text0_changes = {};

			if (dirty & /*$$scope, info*/ 257) {
				text0_changes.$$scope = { dirty, ctx };
			}

			text0.$set(text0_changes);
			const text1_changes = {};

			if (dirty & /*$$scope, info*/ 257) {
				text1_changes.$$scope = { dirty, ctx };
			}

			text1.$set(text1_changes);
			const text2_changes = {};

			if (dirty & /*$$scope, info*/ 257) {
				text2_changes.$$scope = { dirty, ctx };
			}

			text2.$set(text2_changes);
			const text3_changes = {};

			if (dirty & /*$$scope, info*/ 257) {
				text3_changes.$$scope = { dirty, ctx };
			}

			text3.$set(text3_changes);
			const text4_changes = {};

			if (dirty & /*$$scope, info*/ 257) {
				text4_changes.$$scope = { dirty, ctx };
			}

			text4.$set(text4_changes);
		},
		i(local) {
			if (current) return;
			transition_in(text0.$$.fragment, local);
			transition_in(text1.$$.fragment, local);
			transition_in(text2.$$.fragment, local);
			transition_in(text3.$$.fragment, local);
			transition_in(text4.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(text0.$$.fragment, local);
			transition_out(text1.$$.fragment, local);
			transition_out(text2.$$.fragment, local);
			transition_out(text3.$$.fragment, local);
			transition_out(text4.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(text0, detaching);
			if (detaching) detach(t0);
			destroy_component(text1, detaching);
			if (detaching) detach(t1);
			if (detaching) detach(div);
			if (detaching) detach(t2);
			destroy_component(text2, detaching);
			if (detaching) detach(t3);
			destroy_component(text3, detaching);
			if (detaching) detach(t4);
			destroy_component(text4, detaching);
		}
	};
}

function create_fragment$4(ctx) {
	let grid;
	let current;

	grid = new Grid({
			props: {
				cols,
				rows: "1fr 1fr",
				bg: /*colors*/ ctx[1][/*info*/ ctx[0].i],
				"gr-flow": "column",
				$$slots: { default: [create_default_slot$4] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(grid.$$.fragment);
		},
		m(target, anchor) {
			mount_component(grid, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const grid_changes = {};
			if (dirty & /*info*/ 1) grid_changes.bg = /*colors*/ ctx[1][/*info*/ ctx[0].i];

			if (dirty & /*$$scope, info*/ 257) {
				grid_changes.$$scope = { dirty, ctx };
			}

			grid.$set(grid_changes);
		},
		i(local) {
			if (current) return;
			transition_in(grid.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(grid.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(grid, detaching);
		}
	};
}

const cols = "130px min-content 1fr 1fr";

function instance$4($$self, $$props, $$invalidate) {
	let { info } = $$props;
	const colors = ["transparent", "&primary-ripple"];

	$$self.$$set = $$props => {
		if ('info' in $$props) $$invalidate(0, info = $$props.info);
	};

	return [info, colors];
}

class Result extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$4, create_fragment$4, safe_not_equal, { info: 0 });
	}
}

/* src\comp\set-manager\set-maker.svelte generated by Svelte v3.58.0 */

function get_each_context$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[13] = list[i];
	return child_ctx;
}

// (50:12) <Text title slot="title">
function create_default_slot_13(ctx) {
	let t;

	return {
		c() {
			t = text("Set Maker");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (50:12) 
function create_title_slot$3(ctx) {
	let text_1;
	let current;

	text_1 = new Text$1({
			props: {
				title: true,
				slot: "title",
				$$slots: { default: [create_default_slot_13] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(text_1.$$.fragment);
		},
		m(target, anchor) {
			mount_component(text_1, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const text_1_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				text_1_changes.$$scope = { dirty, ctx };
			}

			text_1.$set(text_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(text_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(text_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(text_1, detaching);
		}
	};
}

// (49:8) 
function create_header_slot_1$2(ctx) {
	let titlebar;
	let current;

	titlebar = new Titlebar({
			props: {
				slot: "header",
				fill: true,
				color: "primary",
				$$slots: { title: [create_title_slot$3] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(titlebar.$$.fragment);
		},
		m(target, anchor) {
			mount_component(titlebar, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const titlebar_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				titlebar_changes.$$scope = { dirty, ctx };
			}

			titlebar.$set(titlebar_changes);
		},
		i(local) {
			if (current) return;
			transition_in(titlebar.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(titlebar.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(titlebar, detaching);
		}
	};
}

// (78:20) <Button color="danger" on:click={removeRoll(info)}>
function create_default_slot_12(ctx) {
	let icon;
	let current;
	icon = new Icon({ props: { name: "x" } });

	return {
		c() {
			create_component(icon.$$.fragment);
		},
		m(target, anchor) {
			mount_component(icon, target, anchor);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(icon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(icon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(icon, detaching);
		}
	};
}

// (82:24) <Text title>
function create_default_slot_11(ctx) {
	let t_value = /*info*/ ctx[13].name + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*updated*/ 1 && t_value !== (t_value = /*info*/ ctx[13].name + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (83:24) <Text subtitle>
function create_default_slot_10(ctx) {
	let t_value = /*info*/ ctx[13].dice + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*updated*/ 1 && t_value !== (t_value = /*info*/ ctx[13].dice + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (81:20) <Flex pad="0px">
function create_default_slot_9(ctx) {
	let text0;
	let t;
	let text1;
	let current;

	text0 = new Text$1({
			props: {
				title: true,
				$$slots: { default: [create_default_slot_11] },
				$$scope: { ctx }
			}
		});

	text1 = new Text$1({
			props: {
				subtitle: true,
				$$slots: { default: [create_default_slot_10] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(text0.$$.fragment);
			t = space();
			create_component(text1.$$.fragment);
		},
		m(target, anchor) {
			mount_component(text0, target, anchor);
			insert(target, t, anchor);
			mount_component(text1, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const text0_changes = {};

			if (dirty & /*$$scope, updated*/ 65537) {
				text0_changes.$$scope = { dirty, ctx };
			}

			text0.$set(text0_changes);
			const text1_changes = {};

			if (dirty & /*$$scope, updated*/ 65537) {
				text1_changes.$$scope = { dirty, ctx };
			}

			text1.$set(text1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(text0.$$.fragment, local);
			transition_in(text1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(text0.$$.fragment, local);
			transition_out(text1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(text0, detaching);
			if (detaching) detach(t);
			destroy_component(text1, detaching);
		}
	};
}

// (77:16) <Paper card layout={Grid} lprops={{ cols: "48px 1fr" }}>
function create_default_slot_8$1(ctx) {
	let button;
	let t0;
	let flex;
	let t1;
	let current;

	button = new Button({
			props: {
				color: "danger",
				$$slots: { default: [create_default_slot_12] },
				$$scope: { ctx }
			}
		});

	button.$on("click", function () {
		if (is_function(/*removeRoll*/ ctx[5](/*info*/ ctx[13]))) /*removeRoll*/ ctx[5](/*info*/ ctx[13]).apply(this, arguments);
	});

	flex = new Flex({
			props: {
				pad: "0px",
				$$slots: { default: [create_default_slot_9] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(button.$$.fragment);
			t0 = space();
			create_component(flex.$$.fragment);
			t1 = space();
		},
		m(target, anchor) {
			mount_component(button, target, anchor);
			insert(target, t0, anchor);
			mount_component(flex, target, anchor);
			insert(target, t1, anchor);
			current = true;
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			const button_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				button_changes.$$scope = { dirty, ctx };
			}

			button.$set(button_changes);
			const flex_changes = {};

			if (dirty & /*$$scope, updated*/ 65537) {
				flex_changes.$$scope = { dirty, ctx };
			}

			flex.$set(flex_changes);
		},
		i(local) {
			if (current) return;
			transition_in(button.$$.fragment, local);
			transition_in(flex.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(button.$$.fragment, local);
			transition_out(flex.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(button, detaching);
			if (detaching) detach(t0);
			destroy_component(flex, detaching);
			if (detaching) detach(t1);
		}
	};
}

// (76:12) {#each updated.set as info}
function create_each_block$2(ctx) {
	let paper;
	let current;

	paper = new Paper({
			props: {
				card: true,
				layout: Grid,
				lprops: { cols: "48px 1fr" },
				$$slots: { default: [create_default_slot_8$1] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(paper.$$.fragment);
		},
		m(target, anchor) {
			mount_component(paper, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const paper_changes = {};

			if (dirty & /*$$scope, updated*/ 65537) {
				paper_changes.$$scope = { dirty, ctx };
			}

			paper.$set(paper_changes);
		},
		i(local) {
			if (current) return;
			transition_in(paper.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(paper.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(paper, detaching);
		}
	};
}

// (55:8) <Paper slot="content" lprops={{ cross: "stretch" }}>
function create_default_slot_7$1(ctx) {
	let each_1_anchor;
	let current;
	let each_value = /*updated*/ ctx[0].set;
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(target, anchor);
				}
			}

			insert(target, each_1_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*Grid, updated, removeRoll*/ 33) {
				each_value = /*updated*/ ctx[0].set;
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$2(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block$2(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			destroy_each(each_blocks, detaching);
			if (detaching) detach(each_1_anchor);
		}
	};
}

// (58:20) <Button color="danger" on:click={exit(null)} variant="outline">
function create_default_slot_6$3(ctx) {
	let t;

	return {
		c() {
			t = text("Cancel");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (61:20) <Button color="secondary" on:click={exit(updated)} variant="outline">
function create_default_slot_5$3(ctx) {
	let t;

	return {
		c() {
			t = text("Save");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (57:16) <Grid pad="0px" cols="1fr 1fr">
function create_default_slot_4$3(ctx) {
	let button0;
	let t;
	let button1;
	let current;

	button0 = new Button({
			props: {
				color: "danger",
				variant: "outline",
				$$slots: { default: [create_default_slot_6$3] },
				$$scope: { ctx }
			}
		});

	button0.$on("click", /*exit*/ ctx[3](null));

	button1 = new Button({
			props: {
				color: "secondary",
				variant: "outline",
				$$slots: { default: [create_default_slot_5$3] },
				$$scope: { ctx }
			}
		});

	button1.$on("click", function () {
		if (is_function(/*exit*/ ctx[3](/*updated*/ ctx[0]))) /*exit*/ ctx[3](/*updated*/ ctx[0]).apply(this, arguments);
	});

	return {
		c() {
			create_component(button0.$$.fragment);
			t = space();
			create_component(button1.$$.fragment);
		},
		m(target, anchor) {
			mount_component(button0, target, anchor);
			insert(target, t, anchor);
			mount_component(button1, target, anchor);
			current = true;
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			const button0_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				button0_changes.$$scope = { dirty, ctx };
			}

			button0.$set(button0_changes);
			const button1_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				button1_changes.$$scope = { dirty, ctx };
			}

			button1.$set(button1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(button0.$$.fragment, local);
			transition_in(button1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(button0.$$.fragment, local);
			transition_out(button1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(button0, detaching);
			if (detaching) detach(t);
			destroy_component(button1, detaching);
		}
	};
}

// (67:16) <Grid pad="0px" cols="1fr 1fr">
function create_default_slot_3$3(ctx) {
	let input_text0;
	let updating_value;
	let t;
	let input_text1;
	let updating_value_1;
	let current;

	function input_text0_value_binding(value) {
		/*input_text0_value_binding*/ ctx[11](value);
	}

	let input_text0_props = { label: "Roll Name", color: "secondary" };

	if (/*rollName*/ ctx[1] !== void 0) {
		input_text0_props.value = /*rollName*/ ctx[1];
	}

	input_text0 = new Text({ props: input_text0_props });
	binding_callbacks.push(() => bind(input_text0, 'value', input_text0_value_binding));

	function input_text1_value_binding(value) {
		/*input_text1_value_binding*/ ctx[12](value);
	}

	let input_text1_props = { label: "Dice", color: "secondary" };

	if (/*rollSet*/ ctx[2] !== void 0) {
		input_text1_props.value = /*rollSet*/ ctx[2];
	}

	input_text1 = new Text({ props: input_text1_props });
	binding_callbacks.push(() => bind(input_text1, 'value', input_text1_value_binding));

	return {
		c() {
			create_component(input_text0.$$.fragment);
			t = space();
			create_component(input_text1.$$.fragment);
		},
		m(target, anchor) {
			mount_component(input_text0, target, anchor);
			insert(target, t, anchor);
			mount_component(input_text1, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const input_text0_changes = {};

			if (!updating_value && dirty & /*rollName*/ 2) {
				updating_value = true;
				input_text0_changes.value = /*rollName*/ ctx[1];
				add_flush_callback(() => updating_value = false);
			}

			input_text0.$set(input_text0_changes);
			const input_text1_changes = {};

			if (!updating_value_1 && dirty & /*rollSet*/ 4) {
				updating_value_1 = true;
				input_text1_changes.value = /*rollSet*/ ctx[2];
				add_flush_callback(() => updating_value_1 = false);
			}

			input_text1.$set(input_text1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(input_text0.$$.fragment, local);
			transition_in(input_text1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(input_text0.$$.fragment, local);
			transition_out(input_text1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(input_text0, detaching);
			if (detaching) detach(t);
			destroy_component(input_text1, detaching);
		}
	};
}

// (71:16) <Button color="secondary" on:click={addRoll()}>
function create_default_slot_2$3(ctx) {
	let t;

	return {
		c() {
			t = text("Add Roll");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (56:12) <Flex slot="header" cross="stretch">
function create_default_slot_1$3(ctx) {
	let grid0;
	let t0;
	let input_text;
	let updating_value;
	let t1;
	let grid1;
	let t2;
	let button;
	let current;

	grid0 = new Grid({
			props: {
				pad: "0px",
				cols: "1fr 1fr",
				$$slots: { default: [create_default_slot_4$3] },
				$$scope: { ctx }
			}
		});

	function input_text_value_binding(value) {
		/*input_text_value_binding*/ ctx[10](value);
	}

	let input_text_props = { label: "Set Name", color: "primary" };

	if (/*updated*/ ctx[0].name !== void 0) {
		input_text_props.value = /*updated*/ ctx[0].name;
	}

	input_text = new Text({ props: input_text_props });
	binding_callbacks.push(() => bind(input_text, 'value', input_text_value_binding));

	grid1 = new Grid({
			props: {
				pad: "0px",
				cols: "1fr 1fr",
				$$slots: { default: [create_default_slot_3$3] },
				$$scope: { ctx }
			}
		});

	button = new Button({
			props: {
				color: "secondary",
				$$slots: { default: [create_default_slot_2$3] },
				$$scope: { ctx }
			}
		});

	button.$on("click", /*addRoll*/ ctx[4]());

	return {
		c() {
			create_component(grid0.$$.fragment);
			t0 = space();
			create_component(input_text.$$.fragment);
			t1 = space();
			create_component(grid1.$$.fragment);
			t2 = space();
			create_component(button.$$.fragment);
		},
		m(target, anchor) {
			mount_component(grid0, target, anchor);
			insert(target, t0, anchor);
			mount_component(input_text, target, anchor);
			insert(target, t1, anchor);
			mount_component(grid1, target, anchor);
			insert(target, t2, anchor);
			mount_component(button, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const grid0_changes = {};

			if (dirty & /*$$scope, updated*/ 65537) {
				grid0_changes.$$scope = { dirty, ctx };
			}

			grid0.$set(grid0_changes);
			const input_text_changes = {};

			if (!updating_value && dirty & /*updated*/ 1) {
				updating_value = true;
				input_text_changes.value = /*updated*/ ctx[0].name;
				add_flush_callback(() => updating_value = false);
			}

			input_text.$set(input_text_changes);
			const grid1_changes = {};

			if (dirty & /*$$scope, rollSet, rollName*/ 65542) {
				grid1_changes.$$scope = { dirty, ctx };
			}

			grid1.$set(grid1_changes);
			const button_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				button_changes.$$scope = { dirty, ctx };
			}

			button.$set(button_changes);
		},
		i(local) {
			if (current) return;
			transition_in(grid0.$$.fragment, local);
			transition_in(input_text.$$.fragment, local);
			transition_in(grid1.$$.fragment, local);
			transition_in(button.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(grid0.$$.fragment, local);
			transition_out(input_text.$$.fragment, local);
			transition_out(grid1.$$.fragment, local);
			transition_out(button.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(grid0, detaching);
			if (detaching) detach(t0);
			destroy_component(input_text, detaching);
			if (detaching) detach(t1);
			destroy_component(grid1, detaching);
			if (detaching) detach(t2);
			destroy_component(button, detaching);
		}
	};
}

// (56:12) 
function create_header_slot$3(ctx) {
	let flex;
	let current;

	flex = new Flex({
			props: {
				slot: "header",
				cross: "stretch",
				$$slots: { default: [create_default_slot_1$3] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(flex.$$.fragment);
		},
		m(target, anchor) {
			mount_component(flex, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const flex_changes = {};

			if (dirty & /*$$scope, rollSet, rollName, updated*/ 65543) {
				flex_changes.$$scope = { dirty, ctx };
			}

			flex.$set(flex_changes);
		},
		i(local) {
			if (current) return;
			transition_in(flex.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(flex.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(flex, detaching);
		}
	};
}

// (55:8) 
function create_content_slot$2(ctx) {
	let paper;
	let current;

	paper = new Paper({
			props: {
				slot: "content",
				lprops: { cross: "stretch" },
				$$slots: {
					header: [create_header_slot$3],
					default: [create_default_slot_7$1]
				},
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(paper.$$.fragment);
		},
		m(target, anchor) {
			mount_component(paper, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const paper_changes = {};

			if (dirty & /*$$scope, rollSet, rollName, updated*/ 65543) {
				paper_changes.$$scope = { dirty, ctx };
			}

			paper.$set(paper_changes);
		},
		i(local) {
			if (current) return;
			transition_in(paper.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(paper.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(paper, detaching);
		}
	};
}

// (47:0) <Screen width="min(640px, 100%)">
function create_default_slot$3(ctx) {
	let paper;
	let current;

	paper = new Paper({
			props: {
				card: true,
				lprops: { p: "0px", cross: "stretch" },
				$$slots: {
					content: [create_content_slot$2],
					header: [create_header_slot_1$2]
				},
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(paper.$$.fragment);
		},
		m(target, anchor) {
			mount_component(paper, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const paper_changes = {};

			if (dirty & /*$$scope, rollSet, rollName, updated*/ 65543) {
				paper_changes.$$scope = { dirty, ctx };
			}

			paper.$set(paper_changes);
		},
		i(local) {
			if (current) return;
			transition_in(paper.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(paper.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(paper, detaching);
		}
	};
}

function create_fragment$3(ctx) {
	let screen;
	let current;

	screen = new Screen({
			props: {
				width: "min(640px, 100%)",
				$$slots: { default: [create_default_slot$3] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(screen.$$.fragment);
		},
		m(target, anchor) {
			mount_component(screen, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const screen_changes = {};

			if (dirty & /*$$scope, rollSet, rollName, updated*/ 65543) {
				screen_changes.$$scope = { dirty, ctx };
			}

			screen.$set(screen_changes);
		},
		i(local) {
			if (current) return;
			transition_in(screen.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(screen.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(screen, detaching);
		}
	};
}

function instance$3($$self, $$props, $$invalidate) {
	let { close } = $$props;
	let { id = asuid() } = $$props;
	let { name = "Dice Set" } = $$props;
	let { set = [] } = $$props;
	let updated = { id, name, set };
	let rollName = "Roll";
	let rollSet = "";
	const exit = handler$(close);

	const addRoll = handler$(() => {
		$$invalidate(0, updated.set = [...updated.set, { name: rollName, dice: rollSet }], updated);
		$$invalidate(1, rollName = "Roll");
		$$invalidate(2, rollSet = "");
	});

	const removeRoll = handler$(roll => $$invalidate(0, updated.set = updated.set.filter(setRoll => setRoll !== roll), updated));

	function input_text_value_binding(value) {
		if ($$self.$$.not_equal(updated.name, value)) {
			updated.name = value;
			$$invalidate(0, updated);
		}
	}

	function input_text0_value_binding(value) {
		rollName = value;
		$$invalidate(1, rollName);
	}

	function input_text1_value_binding(value) {
		rollSet = value;
		$$invalidate(2, rollSet);
	}

	$$self.$$set = $$props => {
		if ('close' in $$props) $$invalidate(6, close = $$props.close);
		if ('id' in $$props) $$invalidate(7, id = $$props.id);
		if ('name' in $$props) $$invalidate(8, name = $$props.name);
		if ('set' in $$props) $$invalidate(9, set = $$props.set);
	};

	return [
		updated,
		rollName,
		rollSet,
		exit,
		addRoll,
		removeRoll,
		close,
		id,
		name,
		set,
		input_text_value_binding,
		input_text0_value_binding,
		input_text1_value_binding
	];
}

class Set_maker extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$3, create_fragment$3, safe_not_equal, { close: 6, id: 7, name: 8, set: 9 });
	}
}

/* src\comp\set-manager\set-display.svelte generated by Svelte v3.58.0 */

function create_default_slot_6$2(ctx) {
	let t_value = /*set*/ ctx[0].set.map(func).join(", ") + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*set*/ 1 && t_value !== (t_value = /*set*/ ctx[0].set.map(func).join(", ") + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (25:0) <Paper card>
function create_default_slot_5$2(ctx) {
	let text_1;
	let current;

	text_1 = new Text$1({
			props: {
				$$slots: { default: [create_default_slot_6$2] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(text_1.$$.fragment);
		},
		m(target, anchor) {
			mount_component(text_1, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const text_1_changes = {};

			if (dirty & /*$$scope, set*/ 9) {
				text_1_changes.$$scope = { dirty, ctx };
			}

			text_1.$set(text_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(text_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(text_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(text_1, detaching);
		}
	};
}

// (27:8) <Text title slot="title">
function create_default_slot_4$2(ctx) {
	let t_value = /*set*/ ctx[0].name + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*set*/ 1 && t_value !== (t_value = /*set*/ ctx[0].name + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (27:8) 
function create_title_slot$2(ctx) {
	let text_1;
	let current;

	text_1 = new Text$1({
			props: {
				title: true,
				slot: "title",
				$$slots: { default: [create_default_slot_4$2] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(text_1.$$.fragment);
		},
		m(target, anchor) {
			mount_component(text_1, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const text_1_changes = {};

			if (dirty & /*$$scope, set*/ 9) {
				text_1_changes.$$scope = { dirty, ctx };
			}

			text_1.$set(text_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(text_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(text_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(text_1, detaching);
		}
	};
}

// (31:8) <Button             color="secondary"             slot="menu"             compact             t-sz="&text-size-title"             on:click={send("pick")}             >
function create_default_slot_3$2(ctx) {
	let icon;
	let current;
	icon = new Icon({ props: { name: "selector" } });

	return {
		c() {
			create_component(icon.$$.fragment);
		},
		m(target, anchor) {
			mount_component(icon, target, anchor);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(icon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(icon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(icon, detaching);
		}
	};
}

// (31:8) 
function create_menu_slot(ctx) {
	let button;
	let current;

	button = new Button({
			props: {
				color: "secondary",
				slot: "menu",
				compact: true,
				"t-sz": "&text-size-title",
				$$slots: { default: [create_default_slot_3$2] },
				$$scope: { ctx }
			}
		});

	button.$on("click", /*send*/ ctx[2]("pick"));

	return {
		c() {
			create_component(button.$$.fragment);
		},
		m(target, anchor) {
			mount_component(button, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const button_changes = {};

			if (dirty & /*$$scope*/ 8) {
				button_changes.$$scope = { dirty, ctx };
			}

			button.$set(button_changes);
		},
		i(local) {
			if (current) return;
			transition_in(button.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(button.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(button, detaching);
		}
	};
}

// (42:12) {#if builtin === false}
function create_if_block(ctx) {
	let button0;
	let t;
	let button1;
	let current;

	button0 = new Button({
			props: {
				color: "danger",
				compact: true,
				"t-sz": "&text-size-title",
				$$slots: { default: [create_default_slot_2$2] },
				$$scope: { ctx }
			}
		});

	button0.$on("click", /*send*/ ctx[2]("remove"));

	button1 = new Button({
			props: {
				color: "primary",
				compact: true,
				"t-sz": "&text-size-title",
				$$slots: { default: [create_default_slot_1$2] },
				$$scope: { ctx }
			}
		});

	button1.$on("click", /*send*/ ctx[2]("edit"));

	return {
		c() {
			create_component(button0.$$.fragment);
			t = space();
			create_component(button1.$$.fragment);
		},
		m(target, anchor) {
			mount_component(button0, target, anchor);
			insert(target, t, anchor);
			mount_component(button1, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const button0_changes = {};

			if (dirty & /*$$scope*/ 8) {
				button0_changes.$$scope = { dirty, ctx };
			}

			button0.$set(button0_changes);
			const button1_changes = {};

			if (dirty & /*$$scope*/ 8) {
				button1_changes.$$scope = { dirty, ctx };
			}

			button1.$set(button1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(button0.$$.fragment, local);
			transition_in(button1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(button0.$$.fragment, local);
			transition_out(button1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(button0, detaching);
			if (detaching) detach(t);
			destroy_component(button1, detaching);
		}
	};
}

// (43:16) <Button                     color="danger"                     compact                     t-sz="&text-size-title"                     on:click={send("remove")}                     >
function create_default_slot_2$2(ctx) {
	let icon;
	let current;
	icon = new Icon({ props: { name: "x" } });

	return {
		c() {
			create_component(icon.$$.fragment);
		},
		m(target, anchor) {
			mount_component(icon, target, anchor);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(icon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(icon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(icon, detaching);
		}
	};
}

// (51:16) <Button                     color="primary"                     compact                     t-sz="&text-size-title"                     on:click={send("edit")}                     >
function create_default_slot_1$2(ctx) {
	let icon;
	let current;
	icon = new Icon({ props: { name: "edit" } });

	return {
		c() {
			create_component(icon.$$.fragment);
		},
		m(target, anchor) {
			mount_component(icon, target, anchor);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(icon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(icon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(icon, detaching);
		}
	};
}

// (41:8) <Flex direction="row" pad="0px" slot="action" cross="stretch">
function create_default_slot$2(ctx) {
	let if_block_anchor;
	let current;
	let if_block = /*builtin*/ ctx[1] === false && create_if_block(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (/*builtin*/ ctx[1] === false) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*builtin*/ 2) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (41:8) 
function create_action_slot$1(ctx) {
	let flex;
	let current;

	flex = new Flex({
			props: {
				direction: "row",
				pad: "0px",
				slot: "action",
				cross: "stretch",
				$$slots: { default: [create_default_slot$2] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(flex.$$.fragment);
		},
		m(target, anchor) {
			mount_component(flex, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const flex_changes = {};

			if (dirty & /*$$scope, builtin*/ 10) {
				flex_changes.$$scope = { dirty, ctx };
			}

			flex.$set(flex_changes);
		},
		i(local) {
			if (current) return;
			transition_in(flex.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(flex.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(flex, detaching);
		}
	};
}

// (26:4) 
function create_header_slot$2(ctx) {
	let titlebar;
	let current;

	titlebar = new Titlebar({
			props: {
				slot: "header",
				$$slots: {
					action: [create_action_slot$1],
					menu: [create_menu_slot],
					title: [create_title_slot$2]
				},
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(titlebar.$$.fragment);
		},
		m(target, anchor) {
			mount_component(titlebar, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const titlebar_changes = {};

			if (dirty & /*$$scope, builtin, set*/ 11) {
				titlebar_changes.$$scope = { dirty, ctx };
			}

			titlebar.$set(titlebar_changes);
		},
		i(local) {
			if (current) return;
			transition_in(titlebar.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(titlebar.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(titlebar, detaching);
		}
	};
}

function create_fragment$2(ctx) {
	let paper;
	let current;

	paper = new Paper({
			props: {
				card: true,
				$$slots: {
					header: [create_header_slot$2],
					default: [create_default_slot_5$2]
				},
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(paper.$$.fragment);
		},
		m(target, anchor) {
			mount_component(paper, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const paper_changes = {};

			if (dirty & /*$$scope, builtin, set*/ 11) {
				paper_changes.$$scope = { dirty, ctx };
			}

			paper.$set(paper_changes);
		},
		i(local) {
			if (current) return;
			transition_in(paper.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(paper.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(paper, detaching);
		}
	};
}

const func = d => d.name;

function instance$2($$self, $$props, $$invalidate) {
	let { set } = $$props;
	let { builtin = false } = $$props;
	const send = handler$(createEventDispatcher());

	$$self.$$set = $$props => {
		if ('set' in $$props) $$invalidate(0, set = $$props.set);
		if ('builtin' in $$props) $$invalidate(1, builtin = $$props.builtin);
	};

	return [set, builtin, send];
}

class Set_display extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { set: 0, builtin: 1 });
	}
}

/* src\comp\set-manager.svelte generated by Svelte v3.58.0 */

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[6] = list[i];
	return child_ctx;
}

// (70:12) <Text title slot="title">
function create_default_slot_6$1(ctx) {
	let t;

	return {
		c() {
			t = text("Set Manager");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (70:12) 
function create_title_slot$1(ctx) {
	let text_1;
	let current;

	text_1 = new Text$1({
			props: {
				title: true,
				slot: "title",
				$$slots: { default: [create_default_slot_6$1] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(text_1.$$.fragment);
		},
		m(target, anchor) {
			mount_component(text_1, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const text_1_changes = {};

			if (dirty & /*$$scope*/ 512) {
				text_1_changes.$$scope = { dirty, ctx };
			}

			text_1.$set(text_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(text_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(text_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(text_1, detaching);
		}
	};
}

// (69:8) 
function create_header_slot_1$1(ctx) {
	let titlebar;
	let current;

	titlebar = new Titlebar({
			props: {
				slot: "header",
				fill: true,
				color: "primary",
				$$slots: { title: [create_title_slot$1] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(titlebar.$$.fragment);
		},
		m(target, anchor) {
			mount_component(titlebar, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const titlebar_changes = {};

			if (dirty & /*$$scope*/ 512) {
				titlebar_changes.$$scope = { dirty, ctx };
			}

			titlebar.$set(titlebar_changes);
		},
		i(local) {
			if (current) return;
			transition_in(titlebar.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(titlebar.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(titlebar, detaching);
		}
	};
}

// (93:12) {#each sets as set (set.id)}
function create_each_block$1(key_1, ctx) {
	let first;
	let display;
	let current;
	display = new Set_display({ props: { set: /*set*/ ctx[6] } });

	display.$on("pick", function () {
		if (is_function(/*exit*/ ctx[2](/*set*/ ctx[6]))) /*exit*/ ctx[2](/*set*/ ctx[6]).apply(this, arguments);
	});

	display.$on("remove", function () {
		if (is_function(/*remove*/ ctx[4](/*set*/ ctx[6]))) /*remove*/ ctx[4](/*set*/ ctx[6]).apply(this, arguments);
	});

	return {
		key: key_1,
		first: null,
		c() {
			first = empty();
			create_component(display.$$.fragment);
			this.first = first;
		},
		m(target, anchor) {
			insert(target, first, anchor);
			mount_component(display, target, anchor);
			current = true;
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			const display_changes = {};
			if (dirty & /*sets*/ 2) display_changes.set = /*set*/ ctx[6];
			display.$set(display_changes);
		},
		i(local) {
			if (current) return;
			transition_in(display.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(display.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(first);
			destroy_component(display, detaching);
		}
	};
}

// (75:8) <Paper slot="content" scrollable lprops={{ cross: "stretch" }}>
function create_default_slot_5$1(ctx) {
	let display;
	let t;
	let each_blocks = [];
	let each_1_lookup = new Map();
	let each_1_anchor;
	let current;

	display = new Set_display({
			props: { set: defaultDice, builtin: true }
		});

	display.$on("pick", /*exit*/ ctx[2](defaultDice));
	let each_value = /*sets*/ ctx[1];
	const get_key = ctx => /*set*/ ctx[6].id;

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context$1(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
	}

	return {
		c() {
			create_component(display.$$.fragment);
			t = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			mount_component(display, target, anchor);
			insert(target, t, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(target, anchor);
				}
			}

			insert(target, each_1_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*sets, exit, remove*/ 22) {
				each_value = /*sets*/ ctx[1];
				group_outros();
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, each_1_anchor.parentNode, outro_and_destroy_block, create_each_block$1, each_1_anchor, get_each_context$1);
				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(display.$$.fragment, local);

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			transition_out(display.$$.fragment, local);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			destroy_component(display, detaching);
			if (detaching) detach(t);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d(detaching);
			}

			if (detaching) detach(each_1_anchor);
		}
	};
}

// (77:16) <Button color="danger" variant="outline" on:click={exit(current)}>
function create_default_slot_4$1(ctx) {
	let t;

	return {
		c() {
			t = text("Cancel");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (88:20) <Icon name="plus">
function create_default_slot_3$1(ctx) {
	let t;

	return {
		c() {
			t = text("Add Set");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (81:16) <EntryButton                 variant="outline"                 color="secondary"                 component={SetMaker}                 props={{}}                 on:entry={add()}                 >
function create_default_slot_2$1(ctx) {
	let icon;
	let current;

	icon = new Icon({
			props: {
				name: "plus",
				$$slots: { default: [create_default_slot_3$1] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(icon.$$.fragment);
		},
		m(target, anchor) {
			mount_component(icon, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const icon_changes = {};

			if (dirty & /*$$scope*/ 512) {
				icon_changes.$$scope = { dirty, ctx };
			}

			icon.$set(icon_changes);
		},
		i(local) {
			if (current) return;
			transition_in(icon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(icon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(icon, detaching);
		}
	};
}

// (76:12) <Grid slot="header" cols="1fr 1fr">
function create_default_slot_1$1(ctx) {
	let button;
	let t;
	let entrybutton;
	let current;

	button = new Button({
			props: {
				color: "danger",
				variant: "outline",
				$$slots: { default: [create_default_slot_4$1] },
				$$scope: { ctx }
			}
		});

	button.$on("click", function () {
		if (is_function(/*exit*/ ctx[2](/*current*/ ctx[0]))) /*exit*/ ctx[2](/*current*/ ctx[0]).apply(this, arguments);
	});

	entrybutton = new Entry_button({
			props: {
				variant: "outline",
				color: "secondary",
				component: Set_maker,
				props: {},
				$$slots: { default: [create_default_slot_2$1] },
				$$scope: { ctx }
			}
		});

	entrybutton.$on("entry", /*add*/ ctx[3]());

	return {
		c() {
			create_component(button.$$.fragment);
			t = space();
			create_component(entrybutton.$$.fragment);
		},
		m(target, anchor) {
			mount_component(button, target, anchor);
			insert(target, t, anchor);
			mount_component(entrybutton, target, anchor);
			current = true;
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			const button_changes = {};

			if (dirty & /*$$scope*/ 512) {
				button_changes.$$scope = { dirty, ctx };
			}

			button.$set(button_changes);
			const entrybutton_changes = {};

			if (dirty & /*$$scope*/ 512) {
				entrybutton_changes.$$scope = { dirty, ctx };
			}

			entrybutton.$set(entrybutton_changes);
		},
		i(local) {
			if (current) return;
			transition_in(button.$$.fragment, local);
			transition_in(entrybutton.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(button.$$.fragment, local);
			transition_out(entrybutton.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(button, detaching);
			if (detaching) detach(t);
			destroy_component(entrybutton, detaching);
		}
	};
}

// (76:12) 
function create_header_slot$1(ctx) {
	let grid;
	let current;

	grid = new Grid({
			props: {
				slot: "header",
				cols: "1fr 1fr",
				$$slots: { default: [create_default_slot_1$1] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(grid.$$.fragment);
		},
		m(target, anchor) {
			mount_component(grid, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const grid_changes = {};

			if (dirty & /*$$scope, current*/ 513) {
				grid_changes.$$scope = { dirty, ctx };
			}

			grid.$set(grid_changes);
		},
		i(local) {
			if (current) return;
			transition_in(grid.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(grid.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(grid, detaching);
		}
	};
}

// (75:8) 
function create_content_slot$1(ctx) {
	let paper;
	let current;

	paper = new Paper({
			props: {
				slot: "content",
				scrollable: true,
				lprops: { cross: "stretch" },
				$$slots: {
					header: [create_header_slot$1],
					default: [create_default_slot_5$1]
				},
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(paper.$$.fragment);
		},
		m(target, anchor) {
			mount_component(paper, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const paper_changes = {};

			if (dirty & /*$$scope, current, sets*/ 515) {
				paper_changes.$$scope = { dirty, ctx };
			}

			paper.$set(paper_changes);
		},
		i(local) {
			if (current) return;
			transition_in(paper.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(paper.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(paper, detaching);
		}
	};
}

// (67:0) <Screen width="min(640px, 100%)">
function create_default_slot$1(ctx) {
	let paper;
	let current;

	paper = new Paper({
			props: {
				card: true,
				$$slots: {
					content: [create_content_slot$1],
					header: [create_header_slot_1$1]
				},
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(paper.$$.fragment);
		},
		m(target, anchor) {
			mount_component(paper, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const paper_changes = {};

			if (dirty & /*$$scope, current, sets*/ 515) {
				paper_changes.$$scope = { dirty, ctx };
			}

			paper.$set(paper_changes);
		},
		i(local) {
			if (current) return;
			transition_in(paper.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(paper.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(paper, detaching);
		}
	};
}

function create_fragment$1(ctx) {
	let screen;
	let current;

	screen = new Screen({
			props: {
				width: "min(640px, 100%)",
				$$slots: { default: [create_default_slot$1] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(screen.$$.fragment);
		},
		m(target, anchor) {
			mount_component(screen, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const screen_changes = {};

			if (dirty & /*$$scope, current, sets*/ 515) {
				screen_changes.$$scope = { dirty, ctx };
			}

			screen.$set(screen_changes);
		},
		i(local) {
			if (current) return;
			transition_in(screen.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(screen.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(screen, detaching);
		}
	};
}

const defaultDice = {
	id: "blep",
	name: "Standard Dice",
	set: [
		{ name: "D4", dice: "d4" },
		{ name: "D6", dice: "d6" },
		{ name: "D8", dice: "d8" },
		{ name: "D10", dice: "d10" },
		{ name: "D12", dice: "d12" },
		{ name: "D20", dice: "d20" },
		{ name: "D100", dice: "d100" }
	]
};

function instance$1($$self, $$props, $$invalidate) {
	let { close } = $$props;
	let { current } = $$props;
	let sets = JSON.parse(localStorage.sets ?? "[]");
	const exit = handler$(close);

	const add = eventHandler$(evt => {
		if (evt.detail === null) {
			return;
		}

		$$invalidate(1, sets = [...sets, evt.detail]);
	});

	const remove = handler$(set => {
		$$invalidate(1, sets = sets.filter(s => s !== set));

		if (current.id !== set.id) {
			return;
		}

		$$invalidate(0, current = defaultDice);
	});

	$$self.$$set = $$props => {
		if ('close' in $$props) $$invalidate(5, close = $$props.close);
		if ('current' in $$props) $$invalidate(0, current = $$props.current);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*sets*/ 2) {
			localStorage.sets = JSON.stringify(sets);
		}
	};

	return [current, sets, exit, add, remove, close];
}

class Set_manager extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { close: 5, current: 0 });
	}
}

/* src\app.svelte generated by Svelte v3.58.0 */

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[5] = list[i];
	return child_ctx;
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[5] = list[i];
	return child_ctx;
}

// (39:12) <Text title slot="title">
function create_default_slot_8(ctx) {
	let t;

	return {
		c() {
			t = text("D&D Dice Roller");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (39:12) 
function create_title_slot_1(ctx) {
	let text_1;
	let current;

	text_1 = new Text$1({
			props: {
				title: true,
				slot: "title",
				$$slots: { default: [create_default_slot_8] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(text_1.$$.fragment);
		},
		m(target, anchor) {
			mount_component(text_1, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const text_1_changes = {};

			if (dirty & /*$$scope*/ 1024) {
				text_1_changes.$$scope = { dirty, ctx };
			}

			text_1.$set(text_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(text_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(text_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(text_1, detaching);
		}
	};
}

// (38:8) 
function create_header_slot_2(ctx) {
	let titlebar;
	let current;

	titlebar = new Titlebar({
			props: {
				slot: "header",
				fill: true,
				color: "primary",
				$$slots: { title: [create_title_slot_1] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(titlebar.$$.fragment);
		},
		m(target, anchor) {
			mount_component(titlebar, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const titlebar_changes = {};

			if (dirty & /*$$scope*/ 1024) {
				titlebar_changes.$$scope = { dirty, ctx };
			}

			titlebar.$set(titlebar_changes);
		},
		i(local) {
			if (current) return;
			transition_in(titlebar.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(titlebar.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(titlebar, detaching);
		}
	};
}

// (58:16) {#each dice.set as info}
function create_each_block_1(ctx) {
	let dice_1;
	let current;
	dice_1 = new Dice({ props: { info: /*info*/ ctx[5] } });

	return {
		c() {
			create_component(dice_1.$$.fragment);
		},
		m(target, anchor) {
			mount_component(dice_1, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const dice_1_changes = {};
			if (dirty & /*dice*/ 1) dice_1_changes.info = /*info*/ ctx[5];
			dice_1.$set(dice_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(dice_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(dice_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(dice_1, detaching);
		}
	};
}

// (57:12) <Grid cols="1fr 1fr 1fr" autoRow="48px">
function create_default_slot_7(ctx) {
	let each_1_anchor;
	let current;
	let each_value_1 = /*dice*/ ctx[0].set;
	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(target, anchor);
				}
			}

			insert(target, each_1_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*dice*/ 1) {
				each_value_1 = /*dice*/ ctx[0].set;
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block_1(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				group_outros();

				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value_1.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			destroy_each(each_blocks, detaching);
			if (detaching) detach(each_1_anchor);
		}
	};
}

// (44:8) <Paper slot="content" lprops={{ p: "0px", cross: "stretch" }} scrollable>
function create_default_slot_6(ctx) {
	let grid;
	let current;

	grid = new Grid({
			props: {
				cols: "1fr 1fr 1fr",
				autoRow: "48px",
				$$slots: { default: [create_default_slot_7] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(grid.$$.fragment);
		},
		m(target, anchor) {
			mount_component(grid, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const grid_changes = {};

			if (dirty & /*$$scope, dice*/ 1025) {
				grid_changes.$$scope = { dirty, ctx };
			}

			grid.$set(grid_changes);
		},
		i(local) {
			if (current) return;
			transition_in(grid.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(grid.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(grid, detaching);
		}
	};
}

// (46:16) <EntryButton                 color="secondary"                 variant="fill"                 component={SetManager}                 props={managerProps}                 on:entry={updateSet}                 >
function create_default_slot_5(ctx) {
	let t0;
	let t1_value = /*dice*/ ctx[0].name + "";
	let t1;

	return {
		c() {
			t0 = text("Roll Set: ");
			t1 = text(t1_value);
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*dice*/ 1 && t1_value !== (t1_value = /*dice*/ ctx[0].name + "")) set_data(t1, t1_value);
		},
		d(detaching) {
			if (detaching) detach(t0);
			if (detaching) detach(t1);
		}
	};
}

// (45:12) <Grid slot="header">
function create_default_slot_4(ctx) {
	let entrybutton;
	let current;

	entrybutton = new Entry_button({
			props: {
				color: "secondary",
				variant: "fill",
				component: Set_manager,
				props: /*managerProps*/ ctx[1],
				$$slots: { default: [create_default_slot_5] },
				$$scope: { ctx }
			}
		});

	entrybutton.$on("entry", /*updateSet*/ ctx[3]);

	return {
		c() {
			create_component(entrybutton.$$.fragment);
		},
		m(target, anchor) {
			mount_component(entrybutton, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const entrybutton_changes = {};
			if (dirty & /*managerProps*/ 2) entrybutton_changes.props = /*managerProps*/ ctx[1];

			if (dirty & /*$$scope, dice*/ 1025) {
				entrybutton_changes.$$scope = { dirty, ctx };
			}

			entrybutton.$set(entrybutton_changes);
		},
		i(local) {
			if (current) return;
			transition_in(entrybutton.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(entrybutton.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(entrybutton, detaching);
		}
	};
}

// (45:12) 
function create_header_slot_1(ctx) {
	let grid;
	let current;

	grid = new Grid({
			props: {
				slot: "header",
				$$slots: { default: [create_default_slot_4] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(grid.$$.fragment);
		},
		m(target, anchor) {
			mount_component(grid, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const grid_changes = {};

			if (dirty & /*$$scope, managerProps, dice*/ 1027) {
				grid_changes.$$scope = { dirty, ctx };
			}

			grid.$set(grid_changes);
		},
		i(local) {
			if (current) return;
			transition_in(grid.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(grid.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(grid, detaching);
		}
	};
}

// (44:8) 
function create_content_slot(ctx) {
	let paper;
	let current;

	paper = new Paper({
			props: {
				slot: "content",
				lprops: { p: "0px", cross: "stretch" },
				scrollable: true,
				$$slots: {
					header: [create_header_slot_1],
					default: [create_default_slot_6]
				},
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(paper.$$.fragment);
		},
		m(target, anchor) {
			mount_component(paper, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const paper_changes = {};

			if (dirty & /*$$scope, managerProps, dice*/ 1027) {
				paper_changes.$$scope = { dirty, ctx };
			}

			paper.$set(paper_changes);
		},
		i(local) {
			if (current) return;
			transition_in(paper.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(paper.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(paper, detaching);
		}
	};
}

// (76:12) {#each $rolls as info (info)}
function create_each_block(key_1, ctx) {
	let first;
	let result;
	let current;
	result = new Result({ props: { info: /*info*/ ctx[5] } });

	return {
		key: key_1,
		first: null,
		c() {
			first = empty();
			create_component(result.$$.fragment);
			this.first = first;
		},
		m(target, anchor) {
			insert(target, first, anchor);
			mount_component(result, target, anchor);
			current = true;
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			const result_changes = {};
			if (dirty & /*$rolls*/ 4) result_changes.info = /*info*/ ctx[5];
			result.$set(result_changes);
		},
		i(local) {
			if (current) return;
			transition_in(result.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(result.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(first);
			destroy_component(result, detaching);
		}
	};
}

// (64:8) <Paper slot="footer" h="50vh" scrollable         lprops={{ cross: "stretch", p: "0px" }}>
function create_default_slot_3(ctx) {
	let each_blocks = [];
	let each_1_lookup = new Map();
	let each_1_anchor;
	let current;
	let each_value = /*$rolls*/ ctx[2];
	const get_key = ctx => /*info*/ ctx[5];

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
	}

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(target, anchor);
				}
			}

			insert(target, each_1_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*$rolls*/ 4) {
				each_value = /*$rolls*/ ctx[2];
				group_outros();
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, each_1_anchor.parentNode, outro_and_destroy_block, create_each_block, each_1_anchor, get_each_context);
				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d(detaching);
			}

			if (detaching) detach(each_1_anchor);
		}
	};
}

// (67:16) <Text title slot="title">
function create_default_slot_2(ctx) {
	let t;

	return {
		c() {
			t = text("History");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (67:16) 
function create_title_slot(ctx) {
	let text_1;
	let current;

	text_1 = new Text$1({
			props: {
				title: true,
				slot: "title",
				$$slots: { default: [create_default_slot_2] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(text_1.$$.fragment);
		},
		m(target, anchor) {
			mount_component(text_1, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const text_1_changes = {};

			if (dirty & /*$$scope*/ 1024) {
				text_1_changes.$$scope = { dirty, ctx };
			}

			text_1.$set(text_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(text_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(text_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(text_1, detaching);
		}
	};
}

// (71:16) <Button color={false} on:click={rolls.clear} slot="action">
function create_default_slot_1(ctx) {
	let t;

	return {
		c() {
			t = text("Clear");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (71:16) 
function create_action_slot(ctx) {
	let button;
	let current;

	button = new Button({
			props: {
				color: false,
				slot: "action",
				$$slots: { default: [create_default_slot_1] },
				$$scope: { ctx }
			}
		});

	button.$on("click", rolls.clear);

	return {
		c() {
			create_component(button.$$.fragment);
		},
		m(target, anchor) {
			mount_component(button, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const button_changes = {};

			if (dirty & /*$$scope*/ 1024) {
				button_changes.$$scope = { dirty, ctx };
			}

			button.$set(button_changes);
		},
		i(local) {
			if (current) return;
			transition_in(button.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(button.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(button, detaching);
		}
	};
}

// (66:12) 
function create_header_slot(ctx) {
	let titlebar;
	let current;

	titlebar = new Titlebar({
			props: {
				slot: "header",
				fill: true,
				color: "secondary",
				$$slots: {
					action: [create_action_slot],
					title: [create_title_slot]
				},
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(titlebar.$$.fragment);
		},
		m(target, anchor) {
			mount_component(titlebar, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const titlebar_changes = {};

			if (dirty & /*$$scope*/ 1024) {
				titlebar_changes.$$scope = { dirty, ctx };
			}

			titlebar.$set(titlebar_changes);
		},
		i(local) {
			if (current) return;
			transition_in(titlebar.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(titlebar.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(titlebar, detaching);
		}
	};
}

// (64:8) 
function create_footer_slot(ctx) {
	let paper;
	let current;

	paper = new Paper({
			props: {
				slot: "footer",
				h: "50vh",
				scrollable: true,
				lprops: { cross: "stretch", p: "0px" },
				$$slots: {
					header: [create_header_slot],
					default: [create_default_slot_3]
				},
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(paper.$$.fragment);
		},
		m(target, anchor) {
			mount_component(paper, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const paper_changes = {};

			if (dirty & /*$$scope, $rolls*/ 1028) {
				paper_changes.$$scope = { dirty, ctx };
			}

			paper.$set(paper_changes);
		},
		i(local) {
			if (current) return;
			transition_in(paper.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(paper.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(paper, detaching);
		}
	};
}

// (36:0) <Screen width="min(640px, 100%)">
function create_default_slot(ctx) {
	let paper;
	let current;

	paper = new Paper({
			props: {
				card: true,
				square: true,
				lprops: { p: "0px" },
				$$slots: {
					footer: [create_footer_slot],
					content: [create_content_slot],
					header: [create_header_slot_2]
				},
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(paper.$$.fragment);
		},
		m(target, anchor) {
			mount_component(paper, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const paper_changes = {};

			if (dirty & /*$$scope, $rolls, managerProps, dice*/ 1031) {
				paper_changes.$$scope = { dirty, ctx };
			}

			paper.$set(paper_changes);
		},
		i(local) {
			if (current) return;
			transition_in(paper.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(paper.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(paper, detaching);
		}
	};
}

function create_fragment(ctx) {
	let t;
	let screen;
	let current;
	let mounted;
	let dispose;

	screen = new Screen({
			props: {
				width: "min(640px, 100%)",
				$$slots: { default: [create_default_slot] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			t = space();
			create_component(screen.$$.fragment);
		},
		m(target, anchor) {
			insert(target, t, anchor);
			mount_component(screen, target, anchor);
			current = true;

			if (!mounted) {
				dispose = action_destroyer(wsx$1.call(null, document.body, { theme: "tron", "@app": true }));
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			const screen_changes = {};

			if (dirty & /*$$scope, $rolls, managerProps, dice*/ 1031) {
				screen_changes.$$scope = { dirty, ctx };
			}

			screen.$set(screen_changes);
		},
		i(local) {
			if (current) return;
			transition_in(screen.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(screen.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(t);
			destroy_component(screen, detaching);
			mounted = false;
			dispose();
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let managerProps;
	let $rolls;
	component_subscribe($$self, rolls, $$value => $$invalidate(2, $rolls = $$value));
	let dice = defaultDice;
	const updateSet = evt => $$invalidate(0, dice = evt.detail);

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*dice*/ 1) {
			$$invalidate(1, managerProps = { current: dice });
		}
	};

	return [dice, managerProps, $rolls, updateSet];
}

class App extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, {});
	}
}

new App({
    target: document.body
});
