import os
import pymongo
import osmium
import json
import re
wkbfab = osmium.geom.WKBFactory()
from shapely.geometry import Point, Polygon, MultiPolygon, mapping
import shapely.wkb as wkblib
import geopandas as gpd

from collections import namedtuple
Spec = namedtuple('Spec', ['group', 'layer', 'level'])

class OSM_handler(osmium.SimpleHandler):
	def __init__(self):
		osmium.SimpleHandler.__init__(self)
		self.wkbfab = osmium.geom.WKBFactory()

	def node(self, o):
		add_place(o, 'node')

	def area(self, o):
		add_place(o, 'area')
	

FILTERS = {
	'node': {
		'place': [
			'ocean',
			'sea',
			'country',
			'state',
			'province',
			'region',

			'district',
			'county',

			'subdistrict',
			'municipality',

			'city',
			'town',
			'village',
			'hamlet',
			
			'borough',
			'suburb',

			'quarter',
			'neighbourhood',
			'block'
		]
	},
	'area': {
		'boundary': [ 'administrative' ],
		'water': [ 'canal', 'basin', 'wastewater', 'reservoir' ],
		'natural': [ 'water' ],
		'leisure': [ 'park', 'garden', 'stadium' ],
		'bridge': '*'
	}
}

def add_place(o, geom_type):

	spec = False
	for tag in FILTERS[geom_type]:

		if tag not in o.tags:
			continue

		tag_values = FILTERS[geom_type][tag]
		tag_value = o.tags.get(tag)

		if tag_values != '*' and tag_value not in tag_values:
			continue

		if 'name' not in o.tags:
			continue


		level = 25
		if geom_type == 'area':
			if tag == 'boundary' and 'admin_level' in o.tags:
				level = int(o.tags.get('admin_level'))
		else:
			level = tag_values.index(tag_value)

		spec = Spec(tag, tag_value, level) # Tag, Value, Level

		break

	if not spec:
		return True		

	

	location = None
	if geom_type == 'node':
		location = mapping(Point([o.location.lon,o.location.lat]))
	else:
		wkbshape = wkbfab.create_multipolygon(o)
		location = wkblib.loads(wkbshape, hex=True)
		location = location.simplify(tolerance=.000001, preserve_topology=True)
		if o.tags.get('name') == 'Mile End Park':
			print(o, location.area)
		if location.area < .00001:
			return True
		location = mapping(location)

		
	# Name

	name = o.tags.get('name')
	name = re.sub(r'London Borough of ', '', name).strip()
	name = re.sub(r'Royal Borough of ', '', name).strip()

	# Item
	item = {
		'oid': o.id,
		'name': name,
		'group': spec.group,
		'layer': spec.layer,
		'level': spec.level,
		'location': location
	}

	locations_collection.insert_one(item)

if __name__ == '__main__':
	db_client = pymongo.MongoClient('mongodb://localhost:27017/')
	db = db_client['Maps']
	locations_collection = db['locations']
	locations_collection.drop()

	locations_collection.create_index([('location', '2dsphere')])

	# Remove Node Cache
	try:
		os.remove('/storage/maps/tmp/tmp.nodecache')
	except OSError:
		pass

	handler = OSM_handler()
	idx = 'sparse_file_array,/storage/maps/tmp/tmp.nodecache'
	pbf_input = '/storage/maps/tiles/isle-of-dogs/src.pbf'
	pbf_input = '/storage/maps/tiles/london/src.pbf'
	handler.apply_file(pbf_input, locations=True, idx=idx)

	boundaries = json.load(open('boundaries.json', 'r'))
	for item in boundaries:
		locations_collection.insert_one(item)

	os.remove('/storage/maps/tmp/tmp.nodecache')
	print('Complete')
