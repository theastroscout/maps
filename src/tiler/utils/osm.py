import osmium
from utils.nodes import nodeParse
from utils.ways import wayParse
from utils.areas import areaParse
from utils.configs import getConfig
from utils.features import addFeature
from utils.geometries import getPolygon, getPolygonFromWay, getLine, mapping

'''

	OSM Handler

'''

class OSM_handler(osmium.SimpleHandler):

	def __init__(self, config, groups):
		# super(OSM_handler, self).__init__()	
		osmium.SimpleHandler.__init__(self)
		self.config = config
		self.groups = groups

	
	getConfig = getConfig
	addFeature = addFeature
	
	# Geometry
	getPolygon = getPolygon
	getPolygonFromWay = getPolygonFromWay
	getLine = getLine
	
	mapping = mapping

	node = nodeParse
	area = areaParse
	way = wayParse