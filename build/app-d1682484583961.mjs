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
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.data === data)
        return;
    text.data = data;
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

const e=/(?<key>(?<mod>\w+:)?(?<name>[\$\@\&\w\-]+)(\[(?<args>.*?)\])?)/g,r={"(":1,")":-1},t=e=>{const t=e.trim().replace(/__|_/g,(e=>"__"===e?"_":" "));if(""===t)return [];const o=t.split("").reduce(((e,o,l)=>","===o&&0===e.p?(e.args.push(t.substring(e.s,l).trim()),e.s=l,e):(e.p+=r[o]??0,e)),{args:[],p:0,s:0});return [...o.args,t.slice(o.s).trim()]},o=(e,r)=>void 0===r?"":`${e}: ${(e=>!0===e.startsWith("&")?`var(--${e.slice(1)})`:e)(r)}`,l=e=>(r,t)=>[o(e,t)],a=(...e)=>(r,t)=>e.map((e=>o(e,t)));var i$1=Object.freeze({__proto__:null,cssprop:o,multi:a,simple:l,wsx:e=>Object.entries(e).reduce(((e,[r,t])=>{if(null==t||!1===t)return e;const o=!0===t?r:`${r}[${(e=>e.replace(/( )|(_)/g,((e,r)=>r?"_":"__")))(t)}]`;return e.push(o),e}),[]).join(" ")});const n={area:l("grid-area"),b:l("border"),"b-c":l("border-color"),"b-s":l("border-style"),"b-w":l("border-width"),"b-t":l("border-top"),"b-t-c":l("border-top-color"),"b-t-s":l("border-top-style"),"b-t-w":l("border-top-width"),"b-b":l("border-bottom"),"b-b-c":l("border-bottom-color"),"b-b-s":l("border-bottom-style"),"b-b-w":l("border-bottom-width"),"b-l":l("border-left"),"b-l-c":l("border-left-color"),"b-l-s":l("border-left-style"),"b-l-w":l("border-left-width"),"b-r":l("border-right"),"b-r-c":l("border-right-color"),"b-r-s":l("border-right-style"),"b-r-w":l("border-right-width"),bg:l("background"),"bg-a":l("background-attachment"),"bg-c":l("background-color"),"bg-img":l("background-image"),block:()=>o("display","block"),c:l("color"),col:l("grid-column"),cur:l("cursor"),flex:(e,r="column")=>[o("display","flex"),o("flex-direction",r)],"fl-center":()=>[o("align-items","center"),o("justify-content","center")],"fl-cr-a":l("align-items"),"fl-dir":l("flex-direction"),"fl-wr":l("flex-wrap"),"fl-m-a":l("justify-content"),font:l("font-family"),gap:l("gap"),grid:(e,r="row")=>[o("display","grid"),o("grid-auto-flow",r)],"gr-col":l("grid-template-columns"),"gr-row":l("grid-template-rows"),"gr-acol":l("grid-auto-columns"),"gr-arow":l("grid-auto-rows"),"gr-flow":l("grid-auto-flow"),h:l("height"),"h-max":l("max-height"),"h-min":l("min-height"),hide:()=>[o("display","none")],iblock:()=>[o("display","inline-block")],iflex:(e,r="column")=>[o("display","inline-flex"),o("flex-direction",r)],igrid:(e,r="row")=>[o("display","inline-grid"),o("grid-auto-flow",r)],inset:a("top","left","bottom","right"),"inset-x":a("left","right"),"inset-y":a("top","bottom"),m:l("margin"),"m-b":l("margin-bottom"),"m-l":l("margin-left"),"m-r":l("margin-right"),"m-t":l("margin-top"),over:l("overflow"),"over-x":l("overflow-x"),"over-y":l("overflow-y"),p:l("padding"),"p-b":l("padding-bottom"),"p-l":l("padding-left"),"p-r":l("padding-right"),"p-t":l("padding-top"),"p-x":a("padding-left","padding-right"),"p-y":a("padding-top","padding-bottom"),pos:l("position"),r:l("border-radius"),"r-tl":l("border-top-left-radius"),"r-tr":l("border-top-right-radius"),"r-bl":l("border-bottom-left-radius"),"r-br":l("border-bottom-right-radius"),"r-t":a("border-top-left-radius","border-top-right-radius"),"r-r":a("border-top-right-radius","border-bottom-right-radius"),"r-l":a("border-bottom-left-radius","border-top-left-radius"),"r-b":a("border-bottom-right-radius","border-bottom-left-radius"),row:l("grid-row"),sel:l("user-select"),shdw:l("box-shadow"),"t-a":l("text-align"),"t-br":l("word-break"),"t-deco":l("text-decoration"),"t-lh":l("line-height"),"t-over":l("text-overflow"),"t-sz":l("font-size"),"t-tr":l("text-transform"),"t-wght":l("font-weight"),"t-ws":l("white-space"),theme:()=>[o("color","var(--text-color-normal)"),o("font-family","var(--font)"),o("font-size","var(--text-size-normal)")],tr:l("transform"),w:l("width"),"w-max":l("max-width"),"w-min":l("min-width"),x:l("left"),y:l("top"),"-x":l("right"),"-y":l("bottom"),z:l("z-index"),$color:(e,r)=>[o("--color",`&${r}`),o("--ripple-color",`&${r}-ripple`)],$adorn:()=>[o("display","flex"),o("justify-content","center"),o("align-items","center"),o("padding","2px")],$compact:()=>[o("padding","0px 8px")],$title:()=>[o("font-size","&text-size-title"),o("font-weight","700")],$subtitle:()=>[o("font-size","&text-size-subtitle")],"@flat":()=>[o("border-width","0px"),o("--border-size","0px")],"@outline":()=>[o("border-width","1px"),o("border-color","&color")],"@fill":()=>[o("--ripple-color","var(--ripple-dark) !important"),o("--text-color","&text-color-fill"),o("background-color","&color"),o("color","&text-color-fill")]};var s=[{name:"baseline",style:'@import url(https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Roboto:ital,wght@0,400;0,500;0,700;0,900;1,400;1,500;1,700;1,900&display=swap);@import url(https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.13.0/tabler-icons.min.css);*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}:where([ws-x]){border-style:solid;border-width:0;border-color:var(--text-color-normal)}body,html{padding:0;margin:0;width:100%;height:100%;-webkit-tap-highlight-color:transparent}body[ws-x*="theme["]{background-color:var(--background)}body[ws-x~="@app"]{overflow:hidden;position:fixed;touch-action:pan-x pan-y}'},{name:"avatar",style:"ws-avatar{--color:transparent;--size:36px;display:inline-flex;overflow:hidden;border-radius:500px;align-items:center;justify-content:center;width:var(--size);height:var(--size);background-color:var(--color);color:var(--text-color-fill);vertical-align:text-bottom}ws-avatar>img{width:100%}"},{name:"badge",style:"ws-badge{--color:var(--primary);position:relative;display:inline-grid;overflow:visible}ws-badge::after{position:absolute;content:attr(ws-text);right:-10px;top:0;transform:translateY(-50%);background-color:var(--color);pointer-events:none;border-radius:20px;padding:4px;min-width:20px;height:20px;box-sizing:border-box;text-align:center;font-size:var(--text-size-subtitle);color:var(--text-color-fill);line-height:14px;z-index:5}"},{name:"button",style:':is(label,a):where([ws-x~="@button"]),button:where([ws-x~="@flat"],[ws-x~="@fill"],[ws-x~="@outline"]){--color:var(--text-color-normal);--ripple-color:var(--ripple-normal);border:0 solid var(--color);color:var(--color);font-family:var(--font);background-color:transparent;border-radius:4px;cursor:pointer;padding:8px 16px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;position:relative;user-select:none}:is(label,a):where([ws-x~="@button"]):where(:not([disabled]))::after,button:where([ws-x~="@flat"],[ws-x~="@fill"],[ws-x~="@outline"]):where(:not([disabled]))::after{content:"";position:absolute;top:0;left:0;bottom:0;right:0;transition:background-color 150ms linear;pointer-events:none}:is(label,a):where([ws-x~="@button"]):where(:not([disabled])):active::after,button:where([ws-x~="@flat"],[ws-x~="@fill"],[ws-x~="@outline"]):where(:not([disabled])):active::after{transition:none;background-color:var(--ripple-color)}:is(label,a):where([ws-x~="@button"]):where([disabled]),button:where([ws-x~="@flat"],[ws-x~="@fill"],[ws-x~="@outline"]):where([disabled]){opacity:.6;background-color:rgba(200,200,200,.4)}'},{name:"chip",style:'ws-chip{display:inline-flex;align-items:center;justify-content:center;border-radius:100px;padding:4px 12px;user-select:none;vertical-align:text-bottom}ws-chip:where([ws-x~="$click"]){cursor:pointer;overflow:hidden;position:relative;user-select:none}ws-chip:where([ws-x~="$click"]):where(:not([disabled]))::after{content:"";position:absolute;top:0;left:0;bottom:0;right:0;transition:background-color 150ms linear;pointer-events:none}ws-chip:where([ws-x~="$click"]):where(:not([disabled])):active::after{transition:none;background-color:var(--ripple-color)}'},{name:"control",style:'label:where([ws-x~="@control"]){--color:var(--default);--border-color:var(--default);position:relative;display:inline-grid;grid-template-areas:"label label label"" start control end""extra extra extra";grid-template-rows:minmax(0,min-content) auto minmax(0,min-content);grid-template-columns:minmax(0,min-content) auto minmax(0,min-content);border:1px solid var(--border-color);border-radius:4px;user-select:none;overflow:hidden}label:where([ws-x~="@control"]):where([ws-error])::after{content:attr(ws-error);grid-row:3;grid-column:span 3;padding:4px;font-size:var(--text-size-info);background-color:var(--danger-ripple)}label:where([ws-x~="@control"]):focus-within{--border-color:var(--color)}label:where([ws-x~="@control"]):focus-within:where([ws-x~="@flat"])>:is(input,select){outline:2px solid var(--ripple-color);outline-offset:-2px}label:where([ws-x~="@control"])>:where(select){--color:var(--text-color-normal);border-width:0;padding:8px;min-height:36px;background-color:transparent;color:var(--color);font:var(--font);font-size:var(--text-size-normal);cursor:pointer;background-color:var(--background-layer);grid-area:control}label:where([ws-x~="@control"])>:where(input,textarea):focus,label:where([ws-x~="@control"])>:where(select):focus{outline:0}label:where([ws-x~="@control"])>:where(select) optgroup,label:where([ws-x~="@control"])>:where(select) option{background-color:var(--background-layer);border-color:var(--background-layer);color:var(--text-color-normal);font-size:var(--text-size-normal);font-family:Arial}label:where([ws-x~="@control"])>:where(input,textarea){border-width:0;background:0 0;color:var(--text-normal-color);font-family:var(--font);min-width:24px;min-height:36px;width:100%;height:100%;grid-area:control;padding:4px;background-color:var(--background-layer)}label:where([ws-x~="@control"])>input[type=file]{position:relative;padding:0}label:where([ws-x~="@control"])>input[type=file]::file-selector-button{font-family:var(--font);height:100%;margin:0 4px 0 0;padding:4px;color:var(--text-normal-color);background-color:var(--background-layer);border-width:0;border-right:1px solid var(--border-color);text-decoration:underline}label:where([ws-x~="@control"])>:where([ws-x~="$text"]){grid-area:label;padding:4px;display:flex;align-items:center;border-bottom:var(--border-size, 1px) solid var(--border-color);border-right:var(--border-size, 1px) solid var(--border-color);color:var(--color);width:min-content;white-space:nowrap;border-bottom-right-radius:4px}label:where([ws-x~="@control"])>:where([ws-x~="$text"]):where([ws-hint])::after{font-size:var(--text-size-subtitle);content:"\\a"attr(ws-hint);color:var(--text-color-secondary);white-space:pre;display:contents}label:where([ws-x~="@control"])>:where([ws-x~="slot[start]"],[slot=start]){grid-area:start}label:where([ws-x~="@control"])>:where([ws-x~="slot[end]"],[slot=end]){grid-area:end}'},{name:"flex",style:"ws-flex{display:flex;flex-direction:column;gap:4px;padding:4px;overflow:hidden}ws-flex>*{flex-shrink:0}"},{name:"grid",style:"ws-grid{display:grid;overflow:hidden;gap:4px;padding:4px;grid-auto-rows:min-content}"},{name:"icon",style:"ws-icon{display:inline-block}ws-icon:where(:not(:empty))::before{margin-right:2px}ws-icon::before{font-family:tabler-icons!important;speak:none;font-style:normal;font-weight:400;font-variant:normal;text-transform:none;line-height:1;display:contents;-webkit-font-smoothing:antialiased}"},{name:"link",style:"a:where([ws-x]){--color:var(--text-color-normal)}a:where([ws-x]),a:where([ws-x]):hover,a:where([ws-x]):visited{color:var(--color)}"},{name:"modal",style:'ws-modal{position:fixed;top:0;left:0;bottom:0;right:0;background-color:rgba(0,0,0,.35);z-index:100;display:none}ws-modal>label:first-child{position:absolute;width:100%;height:100%;cursor:pointer}ws-modal[ws-x~="$show"]{display:block}input[type=checkbox]:not(:checked)+ws-modal{display:none}input[type=checkbox]:checked+ws-modal{display:block}ws-modal>:where(:not(label:first-child)){position:absolute;min-width:15vw}ws-modal>:where(:not(label:first-child)):where([ws-x~="@menu"]){top:0;left:0;height:100%}ws-modal>:where(:not(label:first-child)):where([ws-x~="@action"]){top:0;right:0;height:100%}ws-modal>:where(:not(label:first-child)):where([ws-x~="@select"]){top:0;left:50%;transform:translateX(-50%);max-height:75vh;max-width:min(90vw,720px)}ws-modal>:where(:not(label:first-child)):where([ws-x~="@dialog"]){top:50%;left:50%;transform:translate(-50%,-50%)}'},{name:"notification",style:'ws-notification{--background-color:var(--background-layer);--color:var(--text-color-normal);background-color:var(--background-color);color:var(--color);padding:8px;display:inline-flex;flex-direction:row;justify-content:space-between;align-items:center;border-radius:4px;cursor:pointer;user-select:none;border:1px solid var(--text-color-secondary)}ws-notification[ws-x*="$color"]{background-color:var(--color);color:var(--text-color-fill)}'},{name:"paper",style:'ws-paper{--color:var(--layer-border-color);display:grid;border-radius:4px;box-shadow:0 2px 4px var(--shadow-color);overflow:hidden;grid-template-columns:1fr;grid-template-rows:min-content auto min-content;grid-template-areas:"header""content""footer";background-color:var(--background-layer)}ws-paper::before{content:"";grid-area:header}ws-paper::after{content:"";grid-area:footer;pointer-events:none}ws-paper>:where([ws-x~="slot[content]"],[slot=content]){grid-area:content}ws-paper>:where([ws-x~="slot[header]"],[slot=header]){grid-area:header;font-size:var(--text-size-header)}ws-paper>:where([ws-x~="slot[footer]"],[slot=footer]){grid-area:footer}'},{name:"popover",style:'ws-popover{display:grid;position:relative}ws-popover:not(:visibile)>:where([ws-x~="slot[content]"],[slot=content]){display:none}ws-popover>:where([ws-x~="slot[content]"],[slot=content]){position:absolute;z-index:25;display:none}ws-popover[ws-x~="$show"]>:where([ws-x~="slot[content]"],[slot=content]){display:block}ws-popover>input:where([type=checkbox]):checked+:where([ws-x~="slot[content]"],[slot=content]){display:block}ws-popover>input:where([type=checkbox]):not(:checked)+:where([ws-x~="slot[content]"],[slot=content]){display:none}'},{name:"progress",style:'label[ws-x~="@progress"]{--color:var(--text-color-normal);--border-size:0px;display:inline-grid;grid-template-columns:1fr;grid-template-rows:min-content auto;border-radius:4px;overflow:hidden;user-select:none}label[ws-x~="@progress"][ws-x~="$row"]{grid-template-columns:min-content auto;grid-template-rows:1fr}label[ws-x~="@progress"]>[ws-x~="$text"]{padding:4px;display:flex;border-bottom:var(--border-size, 1px) solid var(--color);color:var(--color)}label[ws-x~="@progress"]>progress{min-height:20px;height:100%;width:100%;border:0;background-color:var(--background-layer)}label[ws-x~="@progress"]>progress::-moz-progress-bar{background-color:var(--color);border-radius:0}label[ws-x~="@progress"]>progress::-webkit-progress-bar{background-color:var(--background-layer);border-radius:0}label[ws-x~="@progress"]>progress::-webkit-progress-value{background-color:var(--color);border-radius:0}'},{name:"screen",style:'ws-screen{--stack:0;--screen-width:min(720px, 100%);display:grid;width:calc(100% - var(--sub-pixel-offset));height:calc(100% - 1px);overflow:hidden;position:fixed;top:0;left:0;z-index:200;background-color:rgba(0,0,0,.4);grid-template-columns:auto calc(var(--screen-width) - 16px*var(--stack)) auto;grid-template-areas:". content .";padding-top:calc(8px*var(--stack))}ws-screen[ws-x~="@left"]{grid-template-columns:calc(8px*var(--stack)) calc(var(--screen-width) - 16px*var(--stack)) auto}ws-screen>:where(*){grid-area:content;height:100%;overflow:hidden}'},{name:"table",style:"table:where([ws-x]){--border-color:var(--color);border-spacing:0;position:relative}table:where([ws-x]) thead :is(td,th){background-color:var(--color);color:var(--text-color-fill);font-weight:700}table:where([ws-x]) :is(td,th){padding:8px;white-space:nowrap;background-color:var(--background-layer);border-bottom:1px solid var(--color)}table:where([ws-x]) :where(th:first-child){position:sticky;left:0;z-index:10}table:where([ws-x]) :where(td:first-child,th:first-child){border-left:1px solid var(--color)}table:where([ws-x]) :where(td:last-child,th:last-child){border-right:1px solid var(--color)}"},{name:"tabs",style:'ws-tabs{--color:var(--primary);display:flex;flex-direction:row;justify-content:stretch;align-items:stretch;user-select:none;cursor:pointer;gap:2px;padding:2px}ws-tabs[ws-x~="$vert"]{flex-direction:column;justify-content:flex-start}ws-tabs[ws-x~="$vert"]>ws-tab{border-bottom-width:0;border-right-width:2px;flex-grow:0}ws-tabs[ws-x~="@solid"]>ws-tab:where([tab-selected]){color:var(--text-color-fill);background-color:var(--color)}ws-tabs>ws-tab{display:flex;justify-content:center;align-items:center;flex-grow:1;padding:8px;border-color:var(--text-color-secondary);border-width:0 0 2px;border-style:solid}ws-tabs>ws-tab:where([tab-selected]){color:var(--color);border-color:var(--color)}'},{name:"titlebar",style:'ws-titlebar{--text-color:var(--text-color-normal);display:grid;height:48px;grid-template-columns:min-content auto min-content;grid-template-areas:"menu title action";user-select:none}ws-titlebar:where(:not([ws-x~="@fill"])){border-bottom:1px solid var(--color, var(--text-color-normal))}ws-titlebar>:where([ws-x~="slot[title]"],[slot=title]){grid-area:title;display:flex;flex-direction:column;justify-content:center;padding:4px}ws-titlebar>:where([ws-x~="slot[menu]"],[slot=menu]){grid-area:menu;--text-color-normal:var(--text-color)}ws-titlebar>:where([ws-x~="slot[action]"],[slot=action]){grid-area:action;--text-color-normal:var(--text-color)}'},{name:"toaster",style:'ws-toaster{position:fixed;z-index:100;display:inline-flex;flex-direction:column;padding:4px;gap:4px;height:min-content!important}ws-toaster[ws-x~="$tl"]{top:0;left:0}ws-toaster[ws-x~="$tc"]{top:0;left:50%;transform:translateX(-50%)}ws-toaster[ws-x~="$tr"]{top:0;right:0}ws-toaster[ws-x~="$ml"]{top:50%;left:0;transform:translateY(-50%)}ws-toaster[ws-x~="$mr"]{top:50%;right:0;transform:translateY(-50%)}ws-toaster[ws-x~="$bl"]{bottom:0;left:0}ws-toaster[ws-x~="$bc"]{bottom:0;left:50%;transform:translateX(-50%)}ws-toaster[ws-x~="$br"]{bottom:0;right:0}'},{name:"toggle",style:'label[ws-x~="@toggle"]{--color:var(--default);--ripple-color:var(--default-ripple);--border-color:var(--default);cursor:pointer;display:inline-flex;align-items:center;justify-content:space-between;padding:4px;border-radius:4px;border:1px solid var(--border-color);overflow:hidden;position:relative;user-select:none}label[ws-x~="@toggle"]:where(:not([disabled]))::after{content:"";position:absolute;top:0;left:0;bottom:0;right:0;transition:background-color 150ms linear;pointer-events:none}label[ws-x~="@toggle"]:where(:not([disabled])):active::after{transition:none;background-color:var(--ripple-color)}label[ws-x~="@toggle"]:focus-within{--border-color:var(--color)}label[ws-x~="@toggle"]:focus-within:where([ws-x~="@flat"]){outline:2px solid var(--ripple-color);outline-offset:-2px}label[ws-x~="@toggle"]>input{position:relative;min-width:20px;min-height:20px;-webkit-appearance:none;appearance:none;margin:0}label[ws-x~="@toggle"]>input:focus{outline:0}label[ws-x~="@toggle"]>input:checked{color:var(--text-color-invert)}label[ws-x~="@toggle"]>input:checked::after{background-color:var(--color)}label[ws-x~="@toggle"]>input::after{content:"";position:absolute;font-size:18px;font-family:tabler-icons!important;speak:none;font-style:normal;font-weight:400;font-variant:normal;text-transform:none;top:50%;left:50%;width:20px;height:20px;transform:translate(-50%,-50%);display:flex;border:1px solid var(--color);border-radius:4px;align-items:center;justify-content:center;overflow:hidden}label[ws-x~="@toggle"]>input[type=radio]::after{border-radius:50%}label[ws-x~="@toggle"]>input[type=radio]:checked::after{content:""}label[ws-x~="@toggle"]>input[type=checkbox]:checked::after{content:""}label[ws-x~="@toggle"]>input[type=checkbox][ws-x~="$switch"]{position:relative;border:1px solid var(--color);height:24px;width:44px;border-radius:12px}label[ws-x~="@toggle"]>input[type=checkbox][ws-x~="$switch"]::after{content:"";background-color:var(--text-color-secondary);position:absolute;width:18px;height:18px;border-radius:10px;top:2px;left:2px;transform:none;border-width:0;transition:left 100ms linear,color 100ms linear}label[ws-x~="@toggle"]>input[type=checkbox][ws-x~="$switch"]:checked::after{background-color:var(--color);left:22px}'},{name:"tooltip",style:'ws-tooltip{position:relative;display:inline-grid;overflow:visible}ws-tooltip::after{position:absolute;content:attr(ws-text);left:50%;bottom:calc(100% + 2px);transform:translateX(-50%);height:20px;background-color:var(--background-layer);opacity:0;transition:opacity 100ms linear;pointer-events:none;border-radius:4px;border:1px solid var(--text-color-secondary);padding:2px 8px;font-size:var(--text-size-subtitle);width:60%;display:flex;align-items:center;justify-content:center;z-index:5}ws-tooltip:hover::after{opacity:1}ws-tooltip[ws-x~="$bottom"]::after{bottom:unset;top:calc(100% + 2px)}'},{name:"dark",style:'[ws-x~="theme[dark]"]{--font:Roboto;--text-light:white;--text-dark:black;--text-color-normal:var(--text-light);--text-color-secondary:#a0a0a0;--text-color-invert:var(--text-dark);--text-color-fill:var(--text-dark);--text-size-normal:14px;--text-size-title:18px;--text-size-header:16px;--text-size-info:13px;--text-size-subtitle:12px;--text-size-data:10px;--background:#161616;--background-layer:#333333;--layer-border-width:1px;--layer-border-color:#505050;--default:var(--text-color-normal);--default-ripple:var(--ripple-normal);--primary:#00aaff;--primary-ripple:#00aaff60;--secondary:#2fbc2f;--secondary-ripple:#2fbc2f60;--danger:#df5348;--danger-ripple:#df534860;--warning:#ffff00;--warning-ripple:#ffff0060;--accent:#ff4dff;--accent-ripple:#ff4dff60;--button-filled-text-color:var(--text-color-normal);--ripple-dark:#00000060;--ripple-light:#FFFFFF60;--ripple-normal:var(--ripple-light);--ripple-invert:var(--ripple-dark);--shadow-color:rgb(0, 0, 0, 0.25);color-scheme:dark}'},{name:"light",style:'[ws-x~="theme[light]"]{--font:Roboto;--text-light:white;--text-dark:black;--text-color-normal:var(--text-dark);--text-color-secondary:#505050;--text-color-invert:var(--text-light);--text-color-fill:var(--text-light);--text-size-normal:14px;--text-size-title:18px;--text-size-header:16px;--text-size-info:13px;--text-size-subtitle:12px;--text-size-data:10px;--background:#e9e9e9;--background-layer:#ffffff;--layer-border-width:1px;--layer-border-color:#aaaaaa;--default:var(--text-color-normal);--default-ripple:var(--ripple-normal);--primary:#1d62d5;--primary-ripple:#1d62d560;--secondary:#128f12;--secondary-ripple:#128f1260;--danger:#F44336;--danger-ripple:#F4433660;--warning:#db990d;--warning-ripple:#db990d60;--accent:#cf00cf;--accent-ripple:#cf00cf60;--button-filled-text-color:var(--text-color-invert);--ripple-dark:#00000060;--ripple-light:#FFFFFF60;--ripple-normal:var(--ripple-dark);--ripple-invert:var(--ripple-light);--shadow-color:rgb(0, 0, 0, 0.25)}'},{name:"tron",style:'[ws-x~="theme[tron]"]{--font:Orbitron;--text-light:white;--text-dark:black;--text-color-normal:var(--text-light);--text-color-secondary:#a0a0a0;--text-color-invert:var(--text-dark);--text-color-fill:var(--text-dark);--text-size-normal:14px;--text-size-title:18px;--text-size-header:16px;--text-size-info:13px;--text-size-subtitle:12px;--text-size-data:10px;--background:#030303;--background-layer:#04080C;--layer-border-width:1px;--layer-border-color:#00EEEE;--default:var(--text-color-normal);--default-ripple:var(--ripple-normal);--primary:#00aaff;--primary-ripple:#00aaff60;--secondary:#2fbc2f;--secondary-ripple:#2fbc2f60;--danger:#df5348;--danger-ripple:#df534860;--warning:#ffff00;--warning-ripple:#ffff0060;--accent:#ff4dff;--accent-ripple:#ff4dff60;--button-filled-text-color:var(--text-normal);--ripple-dark:#00000060;--ripple-light:#FFFFFF60;--ripple-normal:var(--ripple-light);--ripple-invert:var(--ripple-dark);--shadow-color:rgb(255, 255, 255, 0.25);color-scheme:dark}'}];const d=document.head,c=document.createElement("style"),p=Math.ceil(screen.width*devicePixelRatio*10)%10>=5;s.push({name:"correction",style:`body {--sub-pixel-offset:${p?1:0}px}`});for(const{name:e,style:r}of s){const t=document.createElement("style");t.setAttribute("ws-name",e),t.innerHTML=r,d.appendChild(t);}d.appendChild(c),c.setAttribute("ws-calculated","");const b=c.sheet,x={},w=(e,r)=>[o(`--${e.name.slice(1)}`,r)],h=e=>{if(null===e)return;const r=void 0!==x[e.key],t=void 0===n[e.name]&&!1===e.name.startsWith("&");if(!0===r||!0===t)return;const o=!0===e.name.startsWith("&")?w:n[e.name],l=void 0!==e.mod?`:${e.mod.slice(0,-1)}`:"",a=o(e,...e.args);b.insertRule(`[ws-x][ws-x~="${e.key}"]${l} {\n${a.join(";\n")};\n}`,b.cssRules.length),x[e.key]=b.cssRules[b.cssRules.length-1];},g=r=>{const o=r.getAttribute("ws-x");if(null===o)return;const l=((r,o)=>[...r.matchAll(e)].map((e=>{const{groups:r}=e;return {name:r.name,mod:r.mod,args:t(r.args??""),key:e[0],node:o}})))(o,r);l.forEach(h);},f={childList(e){if(0!==e.addedNodes.length)for(const r of e.addedNodes){(void 0===r.tagName?[]:[r,...r.querySelectorAll("*")]).forEach(g);}},attributes(e){g(e.target);}};new MutationObserver((e=>e.forEach((e=>f[e.type](e))))).observe(document.body,{subtree:!0,attributes:!0,childList:!0,attributeFilter:["ws-x"]});for(const e of document.body.querySelectorAll("*"))g(e);

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
	const default_slot_template = /*#slots*/ ctx[7].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

	return {
		c() {
			button = element("button");
			if (default_slot) default_slot.c();
		},
		m(target, anchor) {
			insert(target, button, anchor);

			if (default_slot) {
				default_slot.m(button, null);
			}

			current = true;

			if (!mounted) {
				dispose = [
					action_destroyer(wsx_action = wsx$1.call(null, button, /*wind*/ ctx[2])),
					listen(button, "click", stop_propagation(/*click_handler_1*/ ctx[9]))
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
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

			if (wsx_action && is_function(wsx_action.update) && dirty & /*wind*/ 4) wsx_action.update.call(null, /*wind*/ ctx[2]);
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

// (71:0) {#if label === true}
function create_if_block$1(ctx) {
	let label_1;
	let wsx_action;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[7].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

	return {
		c() {
			label_1 = element("label");
			if (default_slot) default_slot.c();
			attr(label_1, "for", /*_for*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, label_1, anchor);

			if (default_slot) {
				default_slot.m(label_1, null);
			}

			current = true;

			if (!mounted) {
				dispose = [
					action_destroyer(wsx_action = wsx$1.call(null, label_1, /*wind*/ ctx[2])),
					listen(label_1, "click", stop_propagation(/*click_handler*/ ctx[8]))
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
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

			if (!current || dirty & /*_for*/ 1) {
				attr(label_1, "for", /*_for*/ ctx[0]);
			}

			if (wsx_action && is_function(wsx_action.update) && dirty & /*wind*/ 4) wsx_action.update.call(null, /*wind*/ ctx[2]);
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

function create_fragment$9(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block$1, create_else_block$1];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*label*/ ctx[1] === true) return 0;
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

function instance$9($$self, $$props, $$invalidate) {
	let wind;
	const omit_props_names = ["color","compact","variant","for","label"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	let { color = "default" } = $$props;
	let { compact = false } = $$props;
	let { variant = "flat" } = $$props;
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
		$$invalidate(10, $$restProps = compute_rest_props($$props, omit_props_names));
		if ('color' in $$new_props) $$invalidate(3, color = $$new_props.color);
		if ('compact' in $$new_props) $$invalidate(4, compact = $$new_props.compact);
		if ('variant' in $$new_props) $$invalidate(5, variant = $$new_props.variant);
		if ('for' in $$new_props) $$invalidate(0, _for = $$new_props.for);
		if ('label' in $$new_props) $$invalidate(1, label = $$new_props.label);
		if ('$$scope' in $$new_props) $$invalidate(6, $$scope = $$new_props.$$scope);
	};

	$$self.$$.update = () => {
		$$invalidate(2, wind = {
			[`@${variant}`]: true,
			$color: color,
			$compact: compact,
			"@button": label,
			...$$restProps
		});
	};

	return [
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

		init(this, options, instance$9, create_fragment$9, safe_not_equal, {
			color: 3,
			compact: 4,
			variant: 5,
			for: 0,
			label: 1
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

function create_fragment$8(ctx) {
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

function instance$8($$self, $$props, $$invalidate) {
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

		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
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
			$$slots: { default: [create_default_slot$3] },
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
function create_if_block(ctx) {
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
function create_default_slot$3(ctx) {
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

function create_fragment$7(ctx) {
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
	const if_block_creators = [create_if_block, create_else_block];
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

function instance$7($$self, $$props, $$invalidate) {
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

		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
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

function create_fragment$6(ctx) {
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

function instance$6($$self, $$props, $$invalidate) {
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

		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
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

// let crypto = null
(typeof window !== "undefined")
    ? window.crypto
    : (await import('node:crypto')).default;

BigInt(8640000000000000);

const alphabet = "0123456789abcdefghijklmnopqrstuv";
[...alphabet].reduce(
    (map, ch, index) => {
        map[ch] = BigInt(index);
        return map
    },
    {}
);

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

/* node_modules\@axel669\zephyr\src\screen.svelte generated by Svelte v3.58.0 */

function create_fragment$5(ctx) {
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

function instance$5($$self, $$props, $$invalidate) {
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
		init(this, options, instance$5, create_fragment$5, safe_not_equal, { width: 2 });
	}
}

/* node_modules\@axel669\zephyr\src\text.svelte generated by Svelte v3.58.0 */

function create_fragment$4(ctx) {
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

function instance$4($$self, $$props, $$invalidate) {
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

class Text extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
			title: 1,
			subtitle: 2,
			block: 3,
			adorn: 4
		});
	}
}

/* node_modules\@axel669\zephyr\src\titlebar.svelte generated by Svelte v3.58.0 */
const get_action_slot_changes = dirty => ({});
const get_action_slot_context = ctx => ({});
const get_title_slot_changes = dirty => ({});
const get_title_slot_context = ctx => ({});
const get_menu_slot_changes = dirty => ({});
const get_menu_slot_context = ctx => ({});

function create_fragment$3(ctx) {
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

function instance$3($$self, $$props, $$invalidate) {
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
		init(this, options, instance$3, create_fragment$3, safe_not_equal, { color: 1, fill: 2 });
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
    )
};

/* src\comp\dice.svelte generated by Svelte v3.58.0 */

function create_default_slot$2(ctx) {
	let t0;
	let t1;

	return {
		c() {
			t0 = text("d");
			t1 = text(/*sides*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*sides*/ 1) set_data(t1, /*sides*/ ctx[0]);
		},
		d(detaching) {
			if (detaching) detach(t0);
			if (detaching) detach(t1);
		}
	};
}

function create_fragment$2(ctx) {
	let button;
	let current;

	button = new Button({
			props: {
				variant: "outline",
				color: "primary",
				$$slots: { default: [create_default_slot$2] },
				$$scope: { ctx }
			}
		});

	button.$on("click", /*roll*/ ctx[1]());

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

			if (dirty & /*$$scope, sides*/ 5) {
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

function instance$2($$self, $$props, $$invalidate) {
	let { sides } = $$props;

	const roll = handler$(() => {
		const value = rand(sides);

		rolls.add({
			name: `d${sides}`,
			dice: `d${sides}`,
			values: value.toString(),
			total: value
		});
	});

	$$self.$$set = $$props => {
		if ('sides' in $$props) $$invalidate(0, sides = $$props.sides);
	};

	return [sides, roll];
}

class Dice extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { sides: 0 });
	}
}

/* src\comp\result.svelte generated by Svelte v3.58.0 */

function create_default_slot_4$1(ctx) {
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

// (17:4) <Text t-sz="&text-size-info">
function create_default_slot_3$1(ctx) {
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

// (21:4) <Text title t-a="center">
function create_default_slot_2$1(ctx) {
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

// (22:4) <Text t-sz="&text-size-info">
function create_default_slot_1$1(ctx) {
	let t_value = /*info*/ ctx[0].values + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*info*/ 1 && t_value !== (t_value = /*info*/ ctx[0].values + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (15:0) <Grid cols="160px min-content 1fr" bg={colors[info.i]}>
function create_default_slot$1(ctx) {
	let text0;
	let t0;
	let text1;
	let t1;
	let div;
	let t2;
	let text2;
	let t3;
	let text3;
	let current;

	text0 = new Text({
			props: {
				"t-a": "center",
				$$slots: { default: [create_default_slot_4$1] },
				$$scope: { ctx }
			}
		});

	text1 = new Text({
			props: {
				"t-sz": "&text-size-info",
				$$slots: { default: [create_default_slot_3$1] },
				$$scope: { ctx }
			}
		});

	text2 = new Text({
			props: {
				title: true,
				"t-a": "center",
				$$slots: { default: [create_default_slot_2$1] },
				$$scope: { ctx }
			}
		});

	text3 = new Text({
			props: {
				"t-sz": "&text-size-info",
				$$slots: { default: [create_default_slot_1$1] },
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
			attr(div, "ws-x", "col[2] row[1/3] bg[&secondary] w[3px]");
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
			const text2_changes = {};

			if (dirty & /*$$scope, info*/ 5) {
				text2_changes.$$scope = { dirty, ctx };
			}

			text2.$set(text2_changes);
			const text3_changes = {};

			if (dirty & /*$$scope, info*/ 5) {
				text3_changes.$$scope = { dirty, ctx };
			}

			text3.$set(text3_changes);
		},
		i(local) {
			if (current) return;
			transition_in(text0.$$.fragment, local);
			transition_in(text1.$$.fragment, local);
			transition_in(text2.$$.fragment, local);
			transition_in(text3.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(text0.$$.fragment, local);
			transition_out(text1.$$.fragment, local);
			transition_out(text2.$$.fragment, local);
			transition_out(text3.$$.fragment, local);
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
		}
	};
}

function create_fragment$1(ctx) {
	let grid;
	let current;

	grid = new Grid({
			props: {
				cols: "160px min-content 1fr",
				bg: /*colors*/ ctx[1][/*info*/ ctx[0].i],
				$$slots: { default: [create_default_slot$1] },
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

			if (dirty & /*$$scope, info*/ 5) {
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

function instance$1($$self, $$props, $$invalidate) {
	let { info } = $$props;
	const colors = ["transparent", "&secondary-ripple"];

	$$self.$$set = $$props => {
		if ('info' in $$props) $$invalidate(0, info = $$props.info);
	};

	return [info, colors];
}

class Result extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { info: 0 });
	}
}

/* src\app.svelte generated by Svelte v3.58.0 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[1] = list[i];
	return child_ctx;
}

// (27:8) <Grid cols="1fr 1fr 1fr" autoRow="48px">
function create_default_slot_5(ctx) {
	let dice0;
	let t0;
	let dice1;
	let t1;
	let dice2;
	let t2;
	let dice3;
	let t3;
	let dice4;
	let t4;
	let dice5;
	let t5;
	let dice6;
	let current;
	dice0 = new Dice({ props: { sides: 4 } });
	dice1 = new Dice({ props: { sides: 6 } });
	dice2 = new Dice({ props: { sides: 8 } });
	dice3 = new Dice({ props: { sides: 10 } });
	dice4 = new Dice({ props: { sides: 12 } });
	dice5 = new Dice({ props: { sides: 20 } });
	dice6 = new Dice({ props: { sides: 100 } });

	return {
		c() {
			create_component(dice0.$$.fragment);
			t0 = space();
			create_component(dice1.$$.fragment);
			t1 = space();
			create_component(dice2.$$.fragment);
			t2 = space();
			create_component(dice3.$$.fragment);
			t3 = space();
			create_component(dice4.$$.fragment);
			t4 = space();
			create_component(dice5.$$.fragment);
			t5 = space();
			create_component(dice6.$$.fragment);
		},
		m(target, anchor) {
			mount_component(dice0, target, anchor);
			insert(target, t0, anchor);
			mount_component(dice1, target, anchor);
			insert(target, t1, anchor);
			mount_component(dice2, target, anchor);
			insert(target, t2, anchor);
			mount_component(dice3, target, anchor);
			insert(target, t3, anchor);
			mount_component(dice4, target, anchor);
			insert(target, t4, anchor);
			mount_component(dice5, target, anchor);
			insert(target, t5, anchor);
			mount_component(dice6, target, anchor);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(dice0.$$.fragment, local);
			transition_in(dice1.$$.fragment, local);
			transition_in(dice2.$$.fragment, local);
			transition_in(dice3.$$.fragment, local);
			transition_in(dice4.$$.fragment, local);
			transition_in(dice5.$$.fragment, local);
			transition_in(dice6.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(dice0.$$.fragment, local);
			transition_out(dice1.$$.fragment, local);
			transition_out(dice2.$$.fragment, local);
			transition_out(dice3.$$.fragment, local);
			transition_out(dice4.$$.fragment, local);
			transition_out(dice5.$$.fragment, local);
			transition_out(dice6.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(dice0, detaching);
			if (detaching) detach(t0);
			destroy_component(dice1, detaching);
			if (detaching) detach(t1);
			destroy_component(dice2, detaching);
			if (detaching) detach(t2);
			destroy_component(dice3, detaching);
			if (detaching) detach(t3);
			destroy_component(dice4, detaching);
			if (detaching) detach(t4);
			destroy_component(dice5, detaching);
			if (detaching) detach(t5);
			destroy_component(dice6, detaching);
		}
	};
}

// (20:4) <Paper card square lprops={{ p: "0px", cross: "stretch" }} scrollable>
function create_default_slot_4(ctx) {
	let grid;
	let current;

	grid = new Grid({
			props: {
				cols: "1fr 1fr 1fr",
				autoRow: "48px",
				$$slots: { default: [create_default_slot_5] },
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

			if (dirty & /*$$scope*/ 16) {
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

// (22:12) <Text title slot="title">
function create_default_slot_3(ctx) {
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

// (22:12) 
function create_title_slot_1(ctx) {
	let text_1;
	let current;

	text_1 = new Text({
			props: {
				title: true,
				slot: "title",
				$$slots: { default: [create_default_slot_3] },
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

			if (dirty & /*$$scope*/ 16) {
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

// (21:8) 
function create_header_slot_1(ctx) {
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

			if (dirty & /*$$scope*/ 16) {
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

// (45:12) {#each $rolls as info (info)}
function create_each_block(key_1, ctx) {
	let first;
	let result;
	let current;
	result = new Result({ props: { info: /*info*/ ctx[1] } });

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
			if (dirty & /*$rolls*/ 1) result_changes.info = /*info*/ ctx[1];
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

// (37:8) <Paper slot="footer" h="50vh" scrollable         lprops={{ cross: "stretch", p: "0px" }}>
function create_default_slot_2(ctx) {
	let each_blocks = [];
	let each_1_lookup = new Map();
	let each_1_anchor;
	let current;
	let each_value = /*$rolls*/ ctx[0];
	const get_key = ctx => /*info*/ ctx[1];

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
			if (dirty & /*$rolls*/ 1) {
				each_value = /*$rolls*/ ctx[0];
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

// (40:16) <Text title slot="title">
function create_default_slot_1(ctx) {
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

// (40:16) 
function create_title_slot(ctx) {
	let text_1;
	let current;

	text_1 = new Text({
			props: {
				title: true,
				slot: "title",
				$$slots: { default: [create_default_slot_1] },
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

			if (dirty & /*$$scope*/ 16) {
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

// (39:12) 
function create_header_slot(ctx) {
	let titlebar;
	let current;

	titlebar = new Titlebar({
			props: {
				slot: "header",
				fill: true,
				color: "secondary",
				$$slots: { title: [create_title_slot] },
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

			if (dirty & /*$$scope*/ 16) {
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

// (37:8) 
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
					default: [create_default_slot_2]
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

			if (dirty & /*$$scope, $rolls*/ 17) {
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

// (19:0) <Screen width="min(640px, 100%)">
function create_default_slot(ctx) {
	let paper;
	let current;

	paper = new Paper({
			props: {
				card: true,
				square: true,
				lprops: { p: "0px", cross: "stretch" },
				scrollable: true,
				$$slots: {
					footer: [create_footer_slot],
					header: [create_header_slot_1],
					default: [create_default_slot_4]
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

			if (dirty & /*$$scope, $rolls*/ 17) {
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

			if (dirty & /*$$scope, $rolls*/ 17) {
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
	let $rolls;
	component_subscribe($$self, rolls, $$value => $$invalidate(0, $rolls = $$value));
	return [$rolls];
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
