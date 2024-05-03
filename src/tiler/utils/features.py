'''

Add Features

'''

import sqlite3 as sql
import json
import geopandas as gpd

class Feature:

	def __init__(self, oid, group, layer, data, coords):
		self.oid = oid
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

			skip = False
			if 'skip' in match:
				for s in match['skip']:
					if s in o.tags and (match['skip'][s] == '*' or match['skip'][s] == o.tags.get(s)):
						skip = True
						break

			if skip:
				continue

			group, layer = match['containers'][0].split(':')
			spec = self.config['groups'][group][layer]

			# Collect additional data
			data = {} 
			if 'data' in spec:
				for tag in spec['data']:
					# name_spec = spec['data'][name]
					field_name = tag['field']
					data[field_name] = o.tags.get(field_name)
							
			
			return Feature(o.id, group, layer, data, None)
		

	return False

def addFeature(self, feature):

	# if 'name' in o.tags:
	#	feature.data['name'] = o.tags.get('name')


	data = {
		'oid': feature.oid,
		'group': feature.group,
		'layer': feature.layer,
		'group_layer': feature.group + ':' + feature.layer,
		'data': json.dumps(feature.data),
		'coords': feature.coords.wkt,
		'bounds': feature.coords.wkt
	}

	# print(data)

	
	if feature.coords.geom_type != 'Point':
		bbox = feature.coords.bounds
		bounds = f'POLYGON(({bbox[0]} {bbox[1]}, {bbox[2]} {bbox[1]}, {bbox[2]} {bbox[3]}, {bbox[0]} {bbox[3]}, {bbox[0]} {bbox[1]}))'
		data['bounds'] = bounds

	self.config['bbox'][0] = min(self.config['bbox'][0], feature.coords.bounds[0])
	self.config['bbox'][1] = min(self.config['bbox'][1], feature.coords.bounds[1])
	self.config['bbox'][2] = max(self.config['bbox'][2], feature.coords.bounds[2])
	self.config['bbox'][3] = max(self.config['bbox'][3], feature.coords.bounds[3])
	
	self.db.cursor.execute('INSERT INTO features (`oid`,`group`,`layer`,`group_layer`,`data`,`coords`,`bounds`) VALUES (?, ?, ?, ?, ?, ST_GeomFromText(?), ST_GeomFromText(?))', tuple(data.values()) )
	
	self.db.conn.commit()

	return False