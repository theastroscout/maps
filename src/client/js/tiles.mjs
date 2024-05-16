/*

Surfy° Maps. Tiles

*/

const geometryTypes = ['Point','LineString','MultiLineString','Polygon','MultiPolygon'];

class Tiles {

	constructor(map){
		this.map = map;
		this.storage = {
			tiles: {},
			features: {}
		};

		/*

		Create Tiles Container

		*/

		this.container = document.createElementNS(this.map.svgNS, 'g');
		this.container.classList.add('tiles');
		this.map.container.appendChild(this.container);

	}

	update = () => {
		const zoomID = this.map.zoomID;
		
		/*

		Hide Zoom Group

		*/

		if(zoomID !== this.currentZoomID){

			// Hide Zoom Collection
			if(this.storage.tiles[this.currentZoomID]){
				this.storage.tiles[this.currentZoomID].hide = true;
				// this.storage.tiles[this.currentZoomID].container.remove();
			}

			// Show Zoom Collection
			if(this.storage.tiles[zoomID]){
				this.storage.tiles[zoomID].hide = false;
				this.container.appendChild(this.storage.tiles[zoomID].container);
			}

			// Reassign Zoom ID
			this.currentZoomID = zoomID;

		}

		/*

		Create Tile Assets

		*/

		if(!this.storage.tiles[zoomID]){

			/*

			.SurfyMaps > svg.container > .tiles > .zoom[zoom={zoomID}]

			*/

			const container = document.createElementNS(this.map.svgNS, 'g');
			container.classList.add('zoom');
			container.setAttribute('zoom', zoomID);
			this.container.appendChild(container);

			/*

			Create Zoom instance in Tiles

			*/
			
			this.storage.tiles[zoomID] = {
				container: container,
				groups: {}, // Store Groups
				items: {}, // Store Tiles inside Groups
				visible: {}, // To store currently visible tiles
			};

			/*

			Add Boundaries

			*/

			if(this.map.style?.groups.bounds){
				const boundaries = document.createElementNS(this.map.svgNS, 'g');
				boundaries.classList.add('bounds');
				container.appendChild(boundaries);
				this.storage.tiles[zoomID].groups.bounds = {
					container: boundaries
				}
			}

			this.storage.features[zoomID] = {};
		}

		/*

		Get Tiles List

		*/

		const tiles = this.map.utils.tiles(zoomID);
		
		let visibleTiles = {};
		let queue = [];

		for(let x = tiles[0]; x <= tiles[2]; x++){
			for(let y = tiles[1]; y <= tiles[3]; y++){
				const url = `${zoomID}/${x}/${y}`;
				
				visibleTiles[url] = true;

				if(typeof this.storage.tiles[zoomID].items[url] === 'undefined'){

					/*

					Load Tile

					*/

					this.storage.tiles[zoomID].items[url] = {
						id: url,
						containers: [],
						joinTiles: {}, // To store Join Tiles
					};

					// this.load(zoomID, url)
					queue.push(url)

					/*

					Draw Bounding Box

					*/

					const bounds = this.map.utils.getTileBounds([zoomID,x,y]);
					const border = this.map.draw.bounds(bounds, url, this.storage.tiles[zoomID].groups.bounds.container);

				} else {
					/*

					Show Tile

					*/

					// Remove Tile From Offload List

					if(this.storage.tiles[zoomID].visible[url]){
						delete this.storage.tiles[zoomID].visible[url];
					}

					// Show if it has been hidden
					let tile = this.storage.tiles[zoomID].items[url];
					if(tile && tile.hide){
						tile.hide = false;
						for(let g of tile.containers){
							// g.container.classList.remove('hide');
							// g.parent.classList.remove('hide');
							g.parent.appendChild(g.container);
						}
					}
				}
			}
		}

		/*

		Hide Tiles

		*/

		// Remove joined tiles from the offload list
		for(let url in visibleTiles){
			let tile = this.storage.tiles[zoomID].items[url];
			for(let joinTileURL in tile.joinTiles){
				if(this.storage.tiles[zoomID].visible[joinTileURL]){
					delete this.storage.tiles[zoomID].visible[joinTileURL];
				}
			}
		}

		// Hide invisible tiles
		for(let url in this.storage.tiles[zoomID].visible){
			let tile = this.storage.tiles[zoomID].items[url];
			if(tile && !tile.hide){
				tile.hide = true;
				for(let g of tile.containers){
					// g.classList.add('hide');
					
					// g.remove();
					// console.log('Hide', g, tile)
					g.container.remove();
				}
			}
		}

		// Reassign visible tiles
		this.storage.tiles[zoomID].visible = visibleTiles;

		this.load(zoomID, queue);
	}

	/*

	Parse Features

	*/

	parse = (zoomID, url) => {
		let zoomObj = this.storage.tiles[zoomID];
		let tile = zoomObj.items[url];
		let features = tile.src.split('\n');
			features.pop(); // Remove Last Empty Line

		let processed = {};

		for(let item of features){
			let chunks = item.split('\t');
			let coords = JSON.parse(chunks.pop());


			const fID = chunks.shift();
			
			const geomID = parseInt(chunks.shift(), 10);
			const geomType = geometryTypes[geomID];
			
			const groupID = parseInt(chunks.shift(), 10);
			const group = this.map.style.config[groupID];

			const layerID = parseInt(chunks.shift(), 10);
			const layer = group.layers[layerID];

			if(this.storage.features[zoomID][fID]){
				// Skip feature if it exists
				continue;
			}

			/*

			Parse Data

			*/

			let data = {};
			if(chunks.length){
				const layerConfig = this.map.style.config[groupID].layers[layerID];
				for(let [idx, r] of Object.entries(layerConfig.data)){
					let v = chunks[idx];
					if(typeof r.type === 'object'){
						v = r.type[v];
					}
					data[r.field] = v;
				}
			}
			

			/*

			Create Feature Object

			*/

			let feature = {
				id: fID,
				type: geomType,
				group: group.name,
				layer: layer.name,
				coords: coords,
				data: data,
				tileURL: url
			};

			
			/*

			Create Group if none exists

			*/

			// console.log(feature.group)

			if(!zoomObj.groups[feature.group]){
				
				// Create Container
				const groupContainer = document.createElementNS(this.map.svgNS, 'g');
				groupContainer.classList.add(feature.group);
				
				let before = null;
				
				for(let groupName of Object.keys(this.map.style.groups).reverse()){
					if(groupName === feature.group){
						break;
					}

					if(zoomObj.groups[groupName]){
						before = zoomObj.groups[groupName].container;
					}
				}

				/*
				for(let groupName of Object.keys(zoomObj.groups).reverse()){
					
					if(groupName === feature.group){
						break;
					}

					if(zoomObj.groups[groupName].container){
						before = zoomObj.groups[groupName].container;
					}
				}*/

				zoomObj.container.insertBefore(groupContainer, before);

				/*

				Create Group Object

				*/

				zoomObj.groups[feature.group] = {
					container: groupContainer,
					tiles: {},
					layers: {}
				};

				if(feature.group === 'roads'){
					// Definitions
					const defs = document.createElementNS(this.map.svgNS, 'defs');
					zoomObj.groups[feature.group].container.appendChild(defs);
					zoomObj.groups[feature.group].defs = defs;
					
					// Create Borders Container
					const border = document.createElementNS(this.map.svgNS, 'g');
					border.classList.add('border');
					zoomObj.groups[feature.group].container.appendChild(border);
					zoomObj.groups[feature.group].border = border;

					// Create Fill Container
					const fill = document.createElementNS(this.map.svgNS, 'g');
					fill.classList.add('fill');
					zoomObj.groups[feature.group].container.appendChild(fill);
					zoomObj.groups[feature.group].fill = fill;
					
				}
			}

			/*

			Create Layers

			*/

			if(!zoomObj.groups[feature.group].layers[feature.layer]){

				if(feature.group === 'roads'){

					// Create Definitions
					const defs = document.createElementNS(this.map.svgNS, 'g');
					defs.classList.add(feature.layer);
					zoomObj.groups[feature.group].defs.appendChild(defs);

					// Create Borders Container
					let border;
					if(feature.layer !== 'tunnels'){
						border = document.createElementNS(this.map.svgNS, 'g');
						border.classList.add(feature.layer);
						zoomObj.groups[feature.group].border.appendChild(border);
					}

					// Create Fill Container
					const fill = document.createElementNS(this.map.svgNS, 'g');
					fill.classList.add(feature.layer);
					zoomObj.groups[feature.group].fill.appendChild(fill);

					let layerObj = {
						defs: defs,
						fill: fill,
						tiles: {}
					};

					if(border){
						layerObj.border = border;
					}

					zoomObj.groups[feature.group].layers[feature.layer] = layerObj
				} else {

					/*

					Create Layer

					*/

					const layerContainer = document.createElementNS(this.map.svgNS, 'g');
					
					layerContainer.classList.add(feature.layer);

					let before = null;
				
					for(let layerName of Object.keys(this.map.style.groups[feature.group].layers).reverse()){
						if(layerName === feature.layer){
							break;
						}

						if(zoomObj.groups[feature.group].layers[layerName]){
							before = zoomObj.groups[feature.group].layers[layerName].container;
						}
					}

					zoomObj.groups[feature.group].container.insertBefore(layerContainer, before);
					
					// zoomObj.groups[feature.group].container.appendChild(container);
					
					zoomObj.groups[feature.group].layers[feature.layer] = {
						container: layerContainer,
						tiles: {}
					};
				}
			}

			/*

			Create Tile if none exists

			*/

			if(!zoomObj.groups[feature.group].layers[feature.layer].tiles[url]){

				if(feature.group === 'roads'){

					const defsTile = document.createElementNS(this.map.svgNS, 'g');
					defsTile.setAttribute('tile', url);

					const defsItem = {
						container: defsTile,
						parent: zoomObj.groups[feature.group].layers[feature.layer].defs
					};
					defsItem.parent.appendChild(defsTile);

					/*

					Border

					*/

					let borderTile;
					let borderItem;
					if(zoomObj.groups[feature.group].layers[feature.layer].border){
						borderTile = document.createElementNS(this.map.svgNS, 'g');
						borderTile.setAttribute('tile', url);
						
						borderItem = {
							container: borderTile,
							parent: zoomObj.groups[feature.group].layers[feature.layer].border
						};

						borderItem.parent.appendChild(borderTile);
					}

					/*

					Fill

					*/

					const fillTile = document.createElementNS(this.map.svgNS, 'g');
					fillTile.setAttribute('tile', url);
					

					const fillItem = {
						container: fillTile,
						parent: zoomObj.groups[feature.group].layers[feature.layer].fill
					};
					fillItem.parent.appendChild(fillTile);


					let tilesObj = {
						defs: defsTile,
						fill: fillTile
					};

					if(borderTile){
						tilesObj.border = borderTile;
					}

					zoomObj.groups[feature.group].layers[feature.layer].tiles[url] = tilesObj;

					tile.containers.push(defsItem);
					if(borderTile){
						tile.containers.push(borderItem);
					}
					tile.containers.push(fillItem);

					// Attach Tile Container to the Feature
					

				} else {

					const tileContainer = document.createElementNS(this.map.svgNS, 'g');
					tileContainer.setAttribute('tile', url);
					const tileItem = {
						container: tileContainer,
						parent: zoomObj.groups[feature.group].layers[feature.layer].container
					};
					tileItem.parent.appendChild(tileContainer);

					zoomObj.groups[feature.group].layers[feature.layer].tiles[url] = tileContainer;

					tile.containers.push(tileItem);
				}
			}

			// Attach Tile Container to the Feature
			feature.container = zoomObj.groups[feature.group].layers[feature.layer].tiles[url];

			/*

			Add feature to the render queue

			*/

			processed[feature.id] = feature;
		}

		this.map.draw.render(url, processed);
	}

	/*

	Load Tiles

	*/

	load = async (zoomID, urls) => {

		if(!urls.length){
			return true;
		}

		const data = {
			method: 'get',
			urls: urls
		};

		const response = await fetch(this.map.style.tiles, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});

		const result = await response.json();

		if(!result.status){
			return false;
		}

		for(let url in result.data){
			const data = result.data[url];
			this.storage.tiles[zoomID].items[url].src = data;

			if(data !== '0'){
				this.parse(zoomID, url);
			} else {
				this.storage.tiles[zoomID].items[url] = false;
			}
		}

		if(!this.map.states.loaded){
			this.map.firstLoad();
		}
	}

	/*

	Lazy Tiles Load, One by One

	*/

	lazyLoad = async (zoomID, url) => {
		let result;
		try {
			let rUrl = `${this.map.style.tiles}/${url}`;
			result = await(await fetch(rUrl)).text();
		} catch(e){
			// Continue Regardless Error
			result = '0';
		}
		
		this.storage.tiles[zoomID].items[url].src = result;

		if(result !== '0'){
			this.parse(zoomID, url);
		} else {
			this.storage.tiles[zoomID].items[url] = false;

			if(!this.map.states.loaded){
				this.map.firstLoad(url);
			}
		}
		
	}
};

export default Tiles;