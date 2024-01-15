'''

Get Config

If specification exists we continue processing data otherwise we skip it

'''

import re
ref_pattern = re.compile(r'^ref.*$')

def getConfig(self, o, type_name):
	'''
	
	type_name - node, area, way

	'''

	# For each layers
	for layer_name, layer in self.layers.items():

		# Skip config
		if type_name not in layer['filters']:
			continue


		# For each value
		for tag, filters in layer['filters'][type_name].items():
			if tag not in o.tags:
				continue

			tag_value = o.tags.get(tag) # Get tag value

			for filter_item in filters:
				if filter_item['values'] != 'any' and tag_value not in filter_item['values']:
					continue

				# If item contains skip tag
				if 'skip' in filter_item:
					for skip in filter_item['skip']:
						if skip in o.tags:
							return False

				'''

				Update Feature Properties

				'''

				properties = {
					'id': o.id,
					'group': filter_item['group'],
					'layer': filter_item['layer'],
					'minzoom': filter_item['minzoom'],
					'maxzoom': filter_item['maxzoom']
				}

				for field in filter_item['properties']:

					if field == 'id':
						v = o.id
					elif field == 'ref':
						for t, tv in o.tags:
							if ref_pattern.match(t):
								v = tv
					else:						
						v = o.tags.get(field)

						# Fix Building Name
						if layer_name == 'buildings' and not v and 'addr:housename' in o.tags:
							v = o.tags.get('addr:housename')

					properties[field] = v
						

				'''

					Return Result to the Parser

				'''

				return {
					'layer': layer,
					'properties': properties
				}			

	return False

def getConfig2(self, o, type_name):

	'''
	
	type_name - node, area, way

	'''

	# For each layers
	for layer_name, layer in self.layers.items():
		
		# Skip config
		if type_name not in layer['filters']:
			continue

		# For each tag
		for tag, tag_values in layer['filters'][type_name].items():
			
			if tag not in o.tags:
				continue
			
			tag_value = o.tags.get(tag) # Get tag value

			if tag_value not in tag_values: # If tag value is not presented in accepted values
				
				if 'any' in tag_values: # If allows any tags and this current tag is not represented in filter
					tag_value = 'any'
				else:
					continue

			'''

			Update Feature Properties

			'''

			properties = {}

			for field, value in tag_values[tag_value].items():
				if field == 'id':
					properties[field] = o.id
				elif value == '_':
					if field in o.tags:
						properties[field] = o.tags.get(field)
				else:
					properties[field] = value

			'''

				Return Result to the Parser

			'''

			return {
				'layer': layer,
				'properties': properties
			}




	return False