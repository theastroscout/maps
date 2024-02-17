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
		style = style || this.map.options.style
		this.obj = document.createElement('link');
		this.obj.rel = 'stylesheet';
		this.obj.type = 'text/css';
		this.obj.href = `/styles/${style}/style.scss`;

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

		Collect Groups and Layers

		*/

		let groups = {};
		for(let rule of rules){
			let path = rule.selectorText.split('>').map(v => v.trim());
			
			const prefix = path.slice(0, 4).join('/')
			
			if(!path[4] || !prefix === '.SurfyMaps/svg.container/g.tiles/g.zoom'){
				continue;
			}
			
			
			
			
			/*

			Group

			*/

			const group = path[4].replace('g.', '');
			
			// Create Group if not exists
			if(!groups[group]){

				groups[group] = {
					position: Object.keys(groups).length,
					name: group,
					layers: {}
				};
			}


			const layerChunk = group === 'roads' ? path[6] : path[5]
 			if(layerChunk){

				/*

				Layer

				*/

				const layer = layerChunk.replace('g.', '');

				if(!groups[group].layers[layer]){
					groups[group].layers[layer] = {
						position: Object.keys(groups[group].layers).length,
						name: layer
					};
				}
			}

			/*

			Collect Rules

			*/

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

		const sortedGroups = Object.values(groups)
			.sort((a, b) => a.position - b.position)
			.map(el => {
				el.layers = Object.values(el.layers).sort((a, b) => a.position - b.position);
				return el;
			});

		console.log(sortedGroups)

		// self.loadConfig();
	}

	/*

	Load Config

	*/

	loadConfig = async () => {
		const url = `${this.tiles}/config.json`;
		this.config = await(await fetch(url)).json();

		this.map.launch();
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