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

	/*

	Parse Style

	*/

	parse(e){
		
		const rules = this.sheet.rules;
		const self = this.self;

		const rootStyles = getComputedStyle(self.map.container);
		self.name = rootStyles.getPropertyValue('--name').replace(/['"]+/g, '');
		self.tiles = rootStyles.getPropertyValue('--tiles').replace(/['"]+/g, '');
		self.sprites = rootStyles.getPropertyValue('--sprites').replace(/['"]+/g, '');

		self.loadSprites();

		/*
			
		let sprites = document.createElement('object');
		sprites.setAttribute('id', 'sprites');
		sprites.setAttribute('type', 'image/svg+xml');
		sprites.setAttribute('data', self.sprites);
		self.map.container.appendChild(sprites);

		sprites = document.createElementNS(self.map.svgNS, 'use');
		sprites.setAttribute('href', self.sprites + '#tfl-lo');
		sprites.style.x = 0;
		self.map.svg.appendChild(sprites);

		setTimeout(() => {
			sprites = document.createElementNS(self.map.svgNS, 'use');
			sprites.setAttribute('href', '#tfl-lu');
			sprites.style.x = 300;
			sprites.style.width = 3;
			self.map.svg.appendChild(sprites);
		}, 1000);
		*/

		/*

		Collect Groups and Layers

		*/

		let groups = {};
		let position = 0;
		for(let rule of rules){
			let path = rule.selectorText.split('>').map(v => v.trim());
			const prefix = path.slice(0, 4).join('/')
			if(path[4] && prefix === '.SurfyMaps/svg.container/g.tiles/g.zoom'){
				
				/*

				Group

				*/

				let group = path[4].replace('g.', '');
				
				// Create Group if not exists
				if(!groups[group]){

					groups[group] = {
						position: position,
						name: group,
						layers: []
					};

					position++;
				}

				/*

				Layer

				*/

				if(path[5]){
					
					// Layer
					// let layer = path[6].replace('g.', '');
					// groups[group].layers.push(layer);

				} else {

					
				}
				
				
			}

			for(let r of rule.style){
				const match = r.match(/--(.+)-rule/);
				if(match){
					const name = match[1];
					const v = rule.style.getPropertyValue(r);
					const options = v.split(',').map(v => v.trim().split(' ').map(Number))

					const dim = rule.style.getPropertyValue(`--${name}-dim`);

					const ruleItem = {
						name: '--' + name,
						dim: dim || '',
						rule: options,
						set: rule.style.setProperty,
						obj: rule
					};

					self.rules.push(ruleItem);
				}
			}
		}

		self.groups = groups;

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
			self.render();
		}
	}

	/*

	Load Sprites

	*/

	loadSprites = async () => {
		const svgContent = await (await fetch(this.sprites)).text();
		const parser = new DOMParser();
		const sourceDoc = parser.parseFromString(svgContent, 'image/svg+xml');
		const symbols = sourceDoc.querySelectorAll('symbol');
		symbols.forEach(symbol => {
			const clonedSymbol = symbol.cloneNode(true);
			this.map.defs.appendChild(clonedSymbol);
		});

		const sprites = document.createElementNS(this.map.svgNS, 'image');
		sprites.setAttribute('href', this.sprites+'#tfl-lu');
		// sprites.setAttribute('width', 300);
		// sprites.setAttribute('height', 300);
		// sprites.style.x = 300;
		sprites.style.width = 300;
		sprites.style.height = 300;
		// this.map.svg.appendChild(sprites);
	}

	/*

	Calculate Style Values

	*/

	render = () => {
		for(let rule of this.rules){
			const v = this.map.utils.getValue(rule.rule);
			rule.obj.style.setProperty(rule.name, v + rule.dim);
		}
	}
};

export default Style;