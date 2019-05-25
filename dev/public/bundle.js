var app = (function () {
	'use strict';

	function noop() {}

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

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	function detach(node) {
		node.parentNode.removeChild(node);
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

	function children(element) {
		return Array.from(element.childNodes);
	}

	function set_data(text, data) {
		data = '' + data;
		if (text.data !== data) text.data = data;
	}

	let current_component;

	function set_current_component(component) {
		current_component = component;
	}

	const dirty_components = [];

	const resolved_promise = Promise.resolve();
	let update_scheduled = false;
	const binding_callbacks = [];
	const render_callbacks = [];
	const flush_callbacks = [];

	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	function flush() {
		const seen_callbacks = new Set();

		do {
			// first, call beforeUpdate functions
			// and update components
			while (dirty_components.length) {
				const component = dirty_components.shift();
				set_current_component(component);
				update(component.$$);
			}

			while (binding_callbacks.length) binding_callbacks.shift()();

			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			while (render_callbacks.length) {
				const callback = render_callbacks.pop();
				if (!seen_callbacks.has(callback)) {
					callback();

					// ...so guard against infinite loops
					seen_callbacks.add(callback);
				}
			}
		} while (dirty_components.length);

		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}

		update_scheduled = false;
	}

	function update($$) {
		if ($$.fragment) {
			$$.update($$.dirty);
			run_all($$.before_render);
			$$.fragment.p($$.dirty, $$.ctx);
			$$.dirty = null;

			$$.after_render.forEach(add_render_callback);
		}
	}

	function mount_component(component, target, anchor) {
		const { fragment, on_mount, on_destroy, after_render } = component.$$;

		fragment.m(target, anchor);

		// onMount happens after the initial afterUpdate. Because
		// afterUpdate callbacks happen in reverse order (inner first)
		// we schedule onMount callbacks before afterUpdate callbacks
		add_render_callback(() => {
			const new_on_destroy = on_mount.map(run).filter(is_function);
			if (on_destroy) {
				on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});

		after_render.forEach(add_render_callback);
	}

	function destroy(component, detaching) {
		if (component.$$) {
			run_all(component.$$.on_destroy);
			component.$$.fragment.d(detaching);

			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			component.$$.on_destroy = component.$$.fragment = null;
			component.$$.ctx = {};
		}
	}

	function make_dirty(component, key) {
		if (!component.$$.dirty) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty = blank_object();
		}
		component.$$.dirty[key] = true;
	}

	function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
		const parent_component = current_component;
		set_current_component(component);

		const props = options.props || {};

		const $$ = component.$$ = {
			fragment: null,
			ctx: null,

			// state
			props: prop_names,
			update: noop,
			not_equal: not_equal$$1,
			bound: blank_object(),

			// lifecycle
			on_mount: [],
			on_destroy: [],
			before_render: [],
			after_render: [],
			context: new Map(parent_component ? parent_component.$$.context : []),

			// everything else
			callbacks: blank_object(),
			dirty: null
		};

		let ready = false;

		$$.ctx = instance
			? instance(component, props, (key, value) => {
				if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
					if ($$.bound[key]) $$.bound[key](value);
					if (ready) make_dirty(component, key);
				}
			})
			: props;

		$$.update();
		ready = true;
		run_all($$.before_render);
		$$.fragment = create_fragment($$.ctx);

		if (options.target) {
			if (options.hydrate) {
				$$.fragment.l(children(options.target));
			} else {
				$$.fragment.c();
			}

			if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
			mount_component(component, options.target, options.anchor);
			flush();
		}

		set_current_component(parent_component);
	}

	class SvelteComponent {
		$destroy() {
			destroy(this, true);
			this.$destroy = noop;
		}

		$on(type, callback) {
			const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
			callbacks.push(callback);

			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		$set() {
			// overridden by instance, if it has props
		}
	}

	function ripple (node) {
	  let { classList, style } = node;
	  let mouseUp;
	  let animationEnd;

	  node.addEventListener('animationend', ({ animationName: name }) => {
	    if (name === 'ripple-start-size') {
	      animationEnd = true;
	      mouseUp && classList.add('ripple-end');
	    } else if (name === 'ripple-end') {
	      classList.remove('ripple-start', 'ripple-end');
	    }
	  });

	  node.addEventListener('mousedown', evt => {
	    classList.remove('ripple-start', 'ripple-end');

	    let rect = node.getBoundingClientRect();
	    let x = evt.pageX - rect.x + 'px';
	    let y = evt.pageY - rect.y + 'px';

	    style.setProperty('--ripple-offset-x', x);
	    style.setProperty('--ripple-offset-y', y);

	    mouseUp = false;
	    animationEnd = false;
	    classList.add('ripple-start');

	    window.addEventListener('mouseup', mouseup);
	  });

	  function mouseup () {
	    mouseUp = true;
	    animationEnd && classList.add('ripple-end');
	    window.removeEventListener('mouseup', mouseup);
	  }

	  return {
	    destroy () {
	      window.removeEventListener('mouseup', mouseup);
	    }
	  }
	}

	/* src\component\Button.svelte generated by Svelte v3.4.2 */

	// (10:4) {#if icon}
	function create_if_block_1(ctx) {
		var i, t;

		return {
			c() {
				i = element("i");
				t = text(ctx.icon);
				i.className = "button-icon material-icons";
			},

			m(target, anchor) {
				insert(target, i, anchor);
				append(i, t);
			},

			p(changed, ctx) {
				if (changed.icon) {
					set_data(t, ctx.icon);
				}
			},

			d(detaching) {
				if (detaching) {
					detach(i);
				}
			}
		};
	}

	// (13:4) {#if !round && !squared}
	function create_if_block(ctx) {
		var div1, div0, t;

		return {
			c() {
				div1 = element("div");
				div0 = element("div");
				t = text(ctx.label);
				div0.className = "button-label";
				div1.className = "button-label-wrapper";
			},

			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				append(div0, t);
			},

			p(changed, ctx) {
				if (changed.label) {
					set_data(t, ctx.label);
				}
			},

			d(detaching) {
				if (detaching) {
					detach(div1);
				}
			}
		};
	}

	function create_fragment(ctx) {
		var button, div, t, ripple_action;

		var if_block0 = (ctx.icon) && create_if_block_1(ctx);

		var if_block1 = (!ctx.round && !ctx.squared) && create_if_block(ctx);

		return {
			c() {
				button = element("button");
				div = element("div");
				if (if_block0) if_block0.c();
				t = space();
				if (if_block1) if_block1.c();
				div.className = "button-outline";
				div.style.cssText = ctx.styleOutline;
				button.className = "button ripple";
				button.style.cssText = ctx.styleButton;
			},

			m(target, anchor) {
				insert(target, button, anchor);
				append(button, div);
				if (if_block0) if_block0.m(div, null);
				append(div, t);
				if (if_block1) if_block1.m(div, null);
				ripple_action = ripple.call(null, button) || {};
			},

			p(changed, ctx) {
				if (ctx.icon) {
					if (if_block0) {
						if_block0.p(changed, ctx);
					} else {
						if_block0 = create_if_block_1(ctx);
						if_block0.c();
						if_block0.m(div, t);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (!ctx.round && !ctx.squared) {
					if (if_block1) {
						if_block1.p(changed, ctx);
					} else {
						if_block1 = create_if_block(ctx);
						if_block1.c();
						if_block1.m(div, null);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if (changed.styleOutline) {
					div.style.cssText = ctx.styleOutline;
				}

				if (changed.styleButton) {
					button.style.cssText = ctx.styleButton;
				}
			},

			i: noop,
			o: noop,

			d(detaching) {
				if (detaching) {
					detach(button);
				}

				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				if (ripple_action && typeof ripple_action.destroy === 'function') ripple_action.destroy();
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let { label = 'Button', round = false, squared = false, text = !round && !squared, contained = round || squared, outlined = false, raised = false, icon = '', size = '36px', color = (contained || raised) ? 'var(--theme-on-primary)' : 'var(--theme-primary)', background = contained ? 'var(--theme-primary)' : 'transparent' } = $$props;

		$$self.$set = $$props => {
			if ('label' in $$props) $$invalidate('label', label = $$props.label);
			if ('round' in $$props) $$invalidate('round', round = $$props.round);
			if ('squared' in $$props) $$invalidate('squared', squared = $$props.squared);
			if ('text' in $$props) $$invalidate('text', text = $$props.text);
			if ('contained' in $$props) $$invalidate('contained', contained = $$props.contained);
			if ('outlined' in $$props) $$invalidate('outlined', outlined = $$props.outlined);
			if ('raised' in $$props) $$invalidate('raised', raised = $$props.raised);
			if ('icon' in $$props) $$invalidate('icon', icon = $$props.icon);
			if ('size' in $$props) $$invalidate('size', size = $$props.size);
			if ('color' in $$props) $$invalidate('color', color = $$props.color);
			if ('background' in $$props) $$invalidate('background', background = $$props.background);
		};

		let borderRadius, styleButton, styleOutline;

		$$self.$$.update = ($$dirty = { round: 1, size: 1, color: 1, background: 1, borderRadius: 1, squared: 1, icon: 1, outlined: 1 }) => {
			if ($$dirty.round) { $$invalidate('borderRadius', borderRadius = round ? '50%' : 'calc(1em/9)'); }
			if ($$dirty.size || $$dirty.color || $$dirty.background || $$dirty.borderRadius) { $$invalidate('styleButton', styleButton = `
  font-size: ${size};
  color: ${color};
  background-color: ${background};
  border-radius: ${borderRadius};
`); }
			if ($$dirty.round || $$dirty.squared || $$dirty.icon || $$dirty.outlined || $$dirty.color || $$dirty.borderRadius) { $$invalidate('styleOutline', styleOutline = `
  width: ${(round || squared) ? '1em' : 'auto'};
  min-width: ${(round || squared) ? '1em' : '2em'};
  padding-right: ${(round || squared) ? 0 : 'calc(2em/9)'};
  padding-left: calc(${(round || squared) ? 0 : icon ? '1em/3' : 'calc(2em/9)'});
  border-color: ${outlined ? color : 'transparent'};
  border-radius: ${borderRadius};
`); }
		};

		return {
			label,
			round,
			squared,
			text,
			contained,
			outlined,
			raised,
			icon,
			size,
			color,
			background,
			styleButton,
			styleOutline
		};
	}

	class Button extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance, create_fragment, safe_not_equal, ["label", "round", "squared", "text", "contained", "outlined", "raised", "icon", "size", "color", "background"]);
		}
	}

	/* dev\App.svelte generated by Svelte v3.4.2 */

	function create_fragment$1(ctx) {
		var t0, t1, t2, t3, t4, br, t5, t6, t7, t8, t9, current;

		var button0 = new Button({ props: { color: "#a9c22c" } });

		var button1 = new Button({
			props: { outlined: true, background: "#a9c22c" }
		});

		var button2 = new Button({
			props: { outlined: true, color: "#a9c22c" }
		});

		var button3 = new Button({ props: { round: true } });

		var button4 = new Button({ props: { squared: true } });

		var button5 = new Button({ props: { icon: "face" } });

		var button6 = new Button({ props: { icon: "menu", contained: true } });

		var button7 = new Button({ props: { icon: "menu", outlined: true } });

		var button8 = new Button({ props: { round: true, icon: "book" } });

		var button9 = new Button({ props: { squared: true, icon: "people" } });

		return {
			c() {
				button0.$$.fragment.c();
				t0 = space();
				button1.$$.fragment.c();
				t1 = space();
				button2.$$.fragment.c();
				t2 = space();
				button3.$$.fragment.c();
				t3 = space();
				button4.$$.fragment.c();
				t4 = space();
				br = element("br");
				t5 = space();
				button5.$$.fragment.c();
				t6 = space();
				button6.$$.fragment.c();
				t7 = space();
				button7.$$.fragment.c();
				t8 = space();
				button8.$$.fragment.c();
				t9 = space();
				button9.$$.fragment.c();
			},

			m(target, anchor) {
				mount_component(button0, target, anchor);
				insert(target, t0, anchor);
				mount_component(button1, target, anchor);
				insert(target, t1, anchor);
				mount_component(button2, target, anchor);
				insert(target, t2, anchor);
				mount_component(button3, target, anchor);
				insert(target, t3, anchor);
				mount_component(button4, target, anchor);
				insert(target, t4, anchor);
				insert(target, br, anchor);
				insert(target, t5, anchor);
				mount_component(button5, target, anchor);
				insert(target, t6, anchor);
				mount_component(button6, target, anchor);
				insert(target, t7, anchor);
				mount_component(button7, target, anchor);
				insert(target, t8, anchor);
				mount_component(button8, target, anchor);
				insert(target, t9, anchor);
				mount_component(button9, target, anchor);
				current = true;
			},

			p: noop,

			i(local) {
				if (current) return;
				button0.$$.fragment.i(local);

				button1.$$.fragment.i(local);

				button2.$$.fragment.i(local);

				button3.$$.fragment.i(local);

				button4.$$.fragment.i(local);

				button5.$$.fragment.i(local);

				button6.$$.fragment.i(local);

				button7.$$.fragment.i(local);

				button8.$$.fragment.i(local);

				button9.$$.fragment.i(local);

				current = true;
			},

			o(local) {
				button0.$$.fragment.o(local);
				button1.$$.fragment.o(local);
				button2.$$.fragment.o(local);
				button3.$$.fragment.o(local);
				button4.$$.fragment.o(local);
				button5.$$.fragment.o(local);
				button6.$$.fragment.o(local);
				button7.$$.fragment.o(local);
				button8.$$.fragment.o(local);
				button9.$$.fragment.o(local);
				current = false;
			},

			d(detaching) {
				button0.$destroy(detaching);

				if (detaching) {
					detach(t0);
				}

				button1.$destroy(detaching);

				if (detaching) {
					detach(t1);
				}

				button2.$destroy(detaching);

				if (detaching) {
					detach(t2);
				}

				button3.$destroy(detaching);

				if (detaching) {
					detach(t3);
				}

				button4.$destroy(detaching);

				if (detaching) {
					detach(t4);
					detach(br);
					detach(t5);
				}

				button5.$destroy(detaching);

				if (detaching) {
					detach(t6);
				}

				button6.$destroy(detaching);

				if (detaching) {
					detach(t7);
				}

				button7.$destroy(detaching);

				if (detaching) {
					detach(t8);
				}

				button8.$destroy(detaching);

				if (detaching) {
					detach(t9);
				}

				button9.$destroy(detaching);
			}
		};
	}

	class App extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, null, create_fragment$1, safe_not_equal, []);
		}
	}

	/* eslint-disable no-undef */

	let app = new App({ target: document.body });

	return app;

}());
