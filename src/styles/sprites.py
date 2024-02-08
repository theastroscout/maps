'''

py ../styles/sprites.py --src ../styles/chrome/sprites --dest ../styles/chrome/sprites.svg

'''

import argparse
import glob
import os
import sys
import xml.etree.ElementTree as ET


def get_svg_files(dir_path):
	return glob.iglob(os.path.join(dir_path, '**/*.svg'), recursive=True)


def to_symbol(file_path):
	file_name = os.path.basename(file_path)
	file_name_without_ext, _ = os.path.splitext(file_name)

	try:
		etree = ET.parse(file_path)
	except ET.ParseError:
		return None

	root = etree.getroot()
	root.attrib.clear()
	root.tag = 'g'
	root.attrib['id'] = file_name_without_ext

	return root


def main():
	parser = argparse.ArgumentParser(description='Create a sprite out of SVG files.')

	parser.add_argument(
		'--src',
		dest='src',
		action='store',
		help='path to the directory that holds SVG files',
		required=True,
	)

	parser.add_argument(
		'--dest',
		dest='dest',
		action='store',
		help='path to the sprite to create',
		required=True,
	)

	args = parser.parse_args()

	ET.register_namespace('', 'http://www.w3.org/2000/svg')
	root = ET.Element('svg')
	root.attrib['viewBox'] = '0 0 100 100'

	'''
		Defs
	'''

	defs = ET.SubElement(root, 'defs')
	style_content = '''g { display: none; } g:target { display: inline; }'''
	style = ET.SubElement(defs, 'style', type='text/css')
	style.text = style_content

	'''

		Icons

	'''

	symbols = ((file_path, to_symbol(file_path)) for file_path in get_svg_files(args.src))
	nb_symbols_in_sprite = 0

	for file_path, symbol in symbols:
		if symbol is None:
			sys.stderr.write('Unable to parse %s. Ignored.\n' % file_path)
			continue

		root.append(symbol)
		nb_symbols_in_sprite += 1

	if nb_symbols_in_sprite == 0:
		sys.stderr.write('No SVG files could be processed.')
		sys.exit(1)

	with open(args.dest, 'w') as fp:
		fp.write(ET.tostring(root).decode())

	print('%s sprites were written to the sprite %s.' % (nb_symbols_in_sprite, args.dest))


if __name__ == '__main__':
	main()