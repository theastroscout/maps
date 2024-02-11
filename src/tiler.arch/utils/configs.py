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

	# For Each Group
	for group_name, group in self.groups.items():

		# Skip config
		if type_name not in group['config']['filters']:
			continue


		# For Each Value
		for tag, filters in group['config']['filters'][type_name].items():
			
			# Skip if tag is not presented
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
					'minzoom': filter_item['minzoom'],
					'maxzoom': filter_item['maxzoom']
				}

				# Add Layer
				if 'layer' in filter_item:
					properties['layer'] = filter_item['layer']

				# Add Class
				if 'class' in filter_item:
					properties['class'] = filter_item['class']

				# Retrieve other properties
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
						if group_name == 'buildings' and not v and 'addr:housename' in o.tags:
							v = o.tags.get('addr:housename')

					properties[field] = v
						

				'''

					Return Result to the Parser

				'''

				return {
					'config': group['config'],
					'compress': group['compress'],
					'properties': properties
				}			

	return False