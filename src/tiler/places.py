import pymongo

import language_tool_python
checker_tool = language_tool_python.LanguageTool('en-GB', config={'maxSpellingSuggestions': 1})

import osmium
wkbfab = osmium.geom.WKBFactory()
from shapely.geometry import Point, Polygon, MultiPolygon, mapping
import shapely.wkb as wkblib

from nanoid import generate

types = []

db_client = pymongo.MongoClient('mongodb://localhost:27017/')
db = db_client['Maps']
places_collection = db['places']

def grammarCorrector(text):
	result = checker_tool.correct(text)
	return result


def fix_coords(items):
	result = []
	for item in items:
		if isinstance(item, tuple):
			result.append(fix_coords(item))
		else:
			result.append(round(item, 5))
	return result

class OSM_handler(osmium.SimpleHandler):

	# def __init__(self,):

	def node(self, o):

		if 'amenity' in o.tags or 'shop' in o.tags or 'sport' in o.tags:
			data = get_data(o, 'node') 
			print(data)

			place = places_collection.find_one({'oid': data['oid']})

			if not place:
				print('Insert')
				data['link'] = generate(size=11)
				places_collection.insert_one(data)
			else:
				print('Update Node')
				# print(place)
				places_collection.update_one({ '_id': place['_id']}, { '$set': data })

	def area(self, o):
		
		if 'amenity' in o.tags or 'shop' in o.tags or 'sport' in o.tags:
			data = get_data(o, 'area')

			print(data)

			place = places_collection.find_one({'oid': data['oid']})

			if not place:
				print('Insert')
				places_collection.insert_one(data)
			else:
				print('Update Area')
				places_collection.update_one({ '_id': place['_id']}, { '$set': data })

def get_data(o, geom_type):
	
	'''

		https://wiki.openstreetmap.org/wiki/Key:shop?uselang=en-GB

	'''

	keywords = []

	place_type = o.tags.get('amenity')
	if not place_type:
		if 'shop' in o.tags:
			place_type = o.tags.get('shop')
			keywords.append('shop')
			keywords.append('store')

			if place_type in ['alcohol', 'bakery', 'beverages', 'brewing_supplies', 'butcher', 'cheese', 'chocolate', 'coffee', 'confectionery', 'convenience', 'dairy', 'deli', 'farm', 'food', 'frozen_food', 'greengrocer', 'health_food', '	ice_cream', 'nuts', 'pasta', 'pastry', 'seafood', 'spices', 'tea', 'water', 'wine']:
				keywords.append('grocery')
			elif place_type in ['fitness_centre']:
				keywords.append('gym')
				keywords.append('fitness')
				keywords.append('health')
		elif 'sport' in o.tags:
			place_type = o.tags.get('sport')
			keywords.append('gym')
			keywords.append('fitness')
			keywords.append('health')


	name = o.tags.get('name')

	if not name and 'addr:housename' in o.tags:
		name = o.tags.get('addr:housename')

	if place_type == 'car_sharing' and 'operator' in o.tags:
		
		keywords.append(o.tags.get('operator'))

		if not name:
			name = o.tags.get('operator')

	if not name:
		name = place_type
		

	name = parse_name(name)
	keywords.append(name)
	keywords.append(parse_name(place_type))

	'''

	Location

	'''


	location = False
	geom = False
	if geom_type == 'node':
		location = mapping(Point([o.location.lon,o.location.lat]))
	else:
		wkbshape = wkbfab.create_multipolygon(o)
		geom = wkblib.loads(wkbshape, hex=True)
		
		location = mapping(geom.centroid)

		geom = mapping(geom)
		geom['coordinates'] = fix_coords(geom['coordinates'])

	location['coordinates'] = fix_coords(location['coordinates'])

	# Keywords

	keywords = list(set(keywords))
	keywords = [x.lower() for x in keywords]
	

	'''
	
	Create Object

	'''

	obj = {
		'oid': o.id,
		# 'geom_type': geom_type,
		'name': parse_name(name),
		'type': place_type,
		'location': location,
		'keywords': keywords,
		'search': ' '.join(keywords)
	}

	if geom:
		if geom['type'] == 'MultiPolygon':
			if len(geom['coordinates']) == 1 and len(geom['coordinates'][0]) == 1:
				geom['type'] = 'Polygon'
				geom['coordinates'] = geom['coordinates'][0][0]
		obj['geom'] = geom

	return obj

def parse_name(name):
	name = name.split('_')
	name = ' '.join(name).capitalize()
	# name = grammarCorrector(name)
	return name


if __name__ == '__main__':
	
	handler = OSM_handler()
	idx = 'sparse_file_array,/storage/maps/tmp/tmp.nodecache'
	pbf_input = '/storage/maps/tiles/isle-of-dogs/src.pbf'
	handler.apply_file(pbf_input, locations=True, idx=idx)
	
	# ['parking', 'fountain', 'school', 'bicycle_parking', 'events_venue', 'place_of_worship', 'toilets', 'townhall', 'waste_disposal', 'court_yard', 'community_centre', 'shelter', 'shower', 'car_sharing', 'bar', 'grave_yard', 'dressing_room', 'bench', 'parking_space', 'boat_storage', 'motorcycle_parking', 'charging_station', 'car_wash']
	# print(types)