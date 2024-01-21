/*

Style

*/

class Style {

	constructor(map){
		this.map = map;
		this.rules = [];
	}

	/*

	Get Style

	*/

	get = style => {

		this.obj = document.createElement('link');
		this.obj.rel = 'stylesheet';
		this.obj.type = 'text/css';
		this.obj.href = `/styles/${style || this.map.options.style}/style.scss`;

		this.obj.self = this;

		this.obj.onload = this.parse;
		document.head.appendChild(this.obj);
	}

	parse(e){
		
		const rules = this.sheet.rules;
		const self = this.self;

		const rootStyles = getComputedStyle(self.map.container);
		self.name = rootStyles.getPropertyValue('--surfy-maps-style-name').replace(/['"]+/g, '');
		self.tiles = rootStyles.getPropertyValue('--surfy-maps-tiles').replace(/['"]+/g, '');

		/*

		Collect Groups and Layers

		*/

		let groups = {};
		// console.log(this.sheet.rules.getPropertyValue('--opacity-values'))
		for(let rule of rules){
			let path = rule.selectorText.split('>').map(v => v.trim());
			const prefix = path.slice(0, 5).join('/')
			if(path[5] && prefix === '.SurfyMaps/svg.container/g.tiles/g.zoom/g.tile'){
				
				/*

				Group

				*/

				let group = path[5].replace('g.', '');
				
				// Create Group if not exists
				if(!groups[group]){
					groups[group] = {
						name: group,
						layers: []
					}
				}

				/*

				Layer

				*/

				if(path[6]){
					
					// Layer
					let layer = path[6].replace('g.', '');
					groups[group].layers.push(layer);

				} else {

					// Group Style
					// console.log(group);
					let opacityRule = rule.style.getPropertyValue('--opacity-rule');
					if(opacityRule){
						opacityRule = opacityRule.split(',').map(v => v.trim().split(' ').map(Number))
						// console.log(opacityRule);
						
						let ruleItem = {
							name: '--opacity',
							rule: opacityRule,
							set: rule.style.setProperty,
							obj: rule
						};

						self.rules.push(ruleItem);
					}
					// console.log('');
					// console.log(rule.style.getPropertyValue('--fill'));
					// rule.style.setProperty('--fill', 'red');
					// console.log(rule.getPropertyValue('--opacity-values'))
				}
				
				
			}
			// console.log(path, path.slice(0, 5).join('>'))
		}

		self.groups = groups; // Object.values(groups);

		/*

		Initialise Map

		*/

		if(!self.map.states.ready){
			self.map.states.ready = true;

			/*

			Resize

			*/

			window.addEventListener('resize', self.map.resize, { passive: true });
			self.map.resize();
		}
	}

	/*

	Calculate Style Values

	*/

	render = () => {
		for(let rule of this.rules){
			console.log(rule);
			const v = this.map.utils.getValue(rule.rule);
			rule.obj.style.setProperty('--opacity', v);
		}
	}
};

export default Style;