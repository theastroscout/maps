'''

py sprites.py --src chrome/sprites --dest chrome/sprites.svg

'''

import argparse
import glob
import os
import sys
import xml.etree.ElementTree as ElementTree


def svg_files(dir_path):
	return glob.iglob(os.path.join(dir_path, "**/*.svg"), recursive=True)


def to_symbol(file_path):
	file_name = os.path.basename(file_path)
	file_name_without_ext, _ = os.path.splitext(file_name)

	try:
		etree = ElementTree.parse(file_path)
	except ElementTree.ParseError:
		return None

	root = etree.getroot()
	root.tag = "symbol"
	root.attrib["id"] = file_name_without_ext

	return root


def main():
	parser = argparse.ArgumentParser(description="Create a sprite out of SVG files.")

	parser.add_argument(
		"--src",
		dest="src",
		action="store",
		help="path to the directory that holds SVG files",
		required=True,
	)

	parser.add_argument(
		"--dest",
		dest="dest",
		action="store",
		help="path to the sprite to create",
		required=True,
	)

	args = parser.parse_args()

	ElementTree.register_namespace("", "http://www.w3.org/2000/svg")
	sprite_elem = ElementTree.Element("svg")

	symbols = ((file_path, to_symbol(file_path)) for file_path in svg_files(args.src))
	nb_symbols_in_sprite = 0

	for file_path, symbol in symbols:
		if symbol is None:
			sys.stderr.write("Unable to parse %s. Ignored.\n" % file_path)
			continue

		sprite_elem.append(symbol)
		nb_symbols_in_sprite += 1

	if nb_symbols_in_sprite == 0:
		sys.stderr.write("No SVG files could be processed.")
		sys.exit(1)

	with open(args.dest, "w") as fp:
		fp.write(ElementTree.tostring(sprite_elem).decode())

	print(
		"%s sprites were written to the sprite %s." % (nb_symbols_in_sprite, args.dest)
	)


if __name__ == "__main__":
	main()