'''

Add Features

'''

import sqlite3 as sql
import json
import geopandas as gpd

# from collections import namedtuple
# Feature = namedtuple('Feature', ['id', 'group', 'layer', 'data', 'coords'])

class Feature:

	def __init__(self, id, group, layer, data, coords):
		self.id = id
		self.group = group
		self.layer = layer
		self.data = data
		self.coords = coords

def getFeature(self, o, type_name):
	filters = self.config['filters'][type_name]
	
	for tag_name in filters:
		if tag_name not in o.tags:
			continue

		# print(tag_name)
		value = o.tags.get(tag_name)

		for match in filters[tag_name]:
			if match['values'] != '*' and value not in match['values']:
				continue

			container = match['containers'][0].split(':')
			data = {}
			return Feature(o.id, container[0], container[1], data, None)
		

	return False

def addFeature(self, feature):

	# if 'name' in o.tags:
	#	feature.data['name'] = o.tags.get('name')

	item = {
		'oid': feature.id,
		'group': feature.group,
		'layer': feature.layer,
		'data': json.dumps(feature.data),
		'coords': feature.coords.wkt
	}
	
	self.db.cursor.execute('INSERT INTO features (`oid`,`group`,`layer`,`data`,`coords`) VALUES (?, ?, ?, ?, ST_GeomFromText(?))', tuple(item.values()) )
	self.db.conn.commit()

	return False