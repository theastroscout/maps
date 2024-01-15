import osmium
from utils.nodes import nodeParse
from utils.ways import wayParse
from utils.areas import areaParse
from utils.configs import getConfig
from utils.features import addFeature
from utils.geometries import getPolygon, getLine, mapping

'''

	OSM Handler

'''

class OSM_handler(osmium.SimpleHandler):

	def __init__(self, config, layers):
		# super(OSM_handler, self).__init__()	
		osmium.SimpleHandler.__init__(self)
		self.config = config
		self.layers = layers

	# node = nodeParse
	getConfig = getConfig
	addFeature = addFeature
	
	# Geometry
	getPolygon = getPolygon
	getLine = getLine
	
	mapping = mapping
	way = wayParse
	area = areaParse