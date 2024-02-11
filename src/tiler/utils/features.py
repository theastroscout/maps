'''

Add Features

'''

import sqlite3 as sql
import geopandas as gpd
from shapely.geometry import Polygon, LineString, Point

def addFeature(self, o, spec):

	# print('Add Feature')
	# print(o)
	# print(spec)

	coords = spec['coords']
	if isinstance(coords, list):
		coords = Point(coords)

	container = spec['containers'][0].split(':')
	data = {}

	if 'name' in o.tags:
		data['name'] = o.tags.get('name')

	item = {
		'id': [o.id],
		'group': [container[0]],
		'layer': [container[1]],
		'geometry': [coords],
		'data': [data]
	}
	# print(item)


	gdf = gpd.GeoDataFrame(item, geometry='geometry')
	print(gdf)

	mode = 'a'
	if 'db' not in self.config:
		# print('Create db', self.config['db_file'])
		self.config['db'] = self.config['db_file']
		mode = 'w'
	
	gdf.to_file(self.config['db'], driver='SQLite', index=False, spatialite=True, layer='features', mode=mode)

	return False