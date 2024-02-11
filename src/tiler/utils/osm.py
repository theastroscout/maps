'''

	OSM Handler

'''

import osmium
from utils.configs import getConfig
from utils.features import addFeature

class OSM_handler(osmium.SimpleHandler):

	def __init__(self, config):
		osmium.SimpleHandler.__init__(self)
		self.config = config

	getConfig = getConfig
	addFeature = addFeature

	def node(self, o):
		if not o.visible:
			return True

		# Get Specification
		spec = self.getConfig(o, 'node')
		
		if not spec:
			return True

		spec['coords'] = [o.location.lon,o.location.lat]

		self.addFeature(o, spec)
		
		return True