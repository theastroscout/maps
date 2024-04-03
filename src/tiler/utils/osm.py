'''

	OSM Handler

'''

import osmium
wkbfab = osmium.geom.WKBFactory()
import shapely.wkb as wkblib
from shapely.geometry import Point, Polygon, MultiPolygon, mapping

from utils.features import getFeature, addFeature

class OSM_handler(osmium.SimpleHandler):

	def __init__(self, config, db):

		'''

		Initialisation

		'''

		osmium.SimpleHandler.__init__(self)
		self.config = config
		self.db = db

	getFeature = getFeature
	addFeature = addFeature

	def node(self, o):

		'''

		Parse Nodes

		'''

		if not o.visible:
			return True

		# Get Specification
		feature = self.getFeature(o, 'node')
		
		if not feature:
			return True

		# Get Geometry
		feature.coords = Point([o.location.lon,o.location.lat])

		# Add Feature to DB
		self.addFeature(feature)
		
		return True

	def area(self, o):

		'''

		Parse Areas

		'''

		if not o.visible:
			return True		

		'''

			Get Features

		'''

		feature = self.getFeature(o, 'area')

		if not feature:
			return True

		# Get Geometry
		wkbshape = wkbfab.create_multipolygon(o)
		feature.coords = wkblib.loads(wkbshape, hex=True)

		# print(feature.coords)
		# print(dir(feature.coords))
		# print(feature.coords.geom_type)
		# print(feature.coords.geoms)
		# if len(feature.coords.geoms) > 1:
		#	print(feature.coords)
		#	exit()
		
		# exit()

		# for coords in feature.coords:
		#	print(coords)
		# exit()

		# Add Feature to DB
		self.addFeature(feature)

		return True

	def way(self, o):

		'''

		Parse Ways

		'''

		if not o.visible:
			return True

		feature = self.getFeature(o, 'way')

		if not feature:
			return True

		# Get Geometry
		wkbshape = wkbfab.create_linestring(o)
		feature.coords = wkblib.loads(wkbshape, hex=True)

		if feature.group == 'roads':
			tunnel = o.tags.get('tunnel')
			if tunnel == 'yes':
				feature.layer = 'tunnels'

		# Add Feature to DB
		self.addFeature(feature)

		return True