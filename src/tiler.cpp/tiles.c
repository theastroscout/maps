#include <iostream>

#include "include/json.h"
using json = nlohmann::ordered_json;

#include <vector>

#include "include/surfy/geom/geom.h"
namespace sg = surfy::geom;

#include "include/print.h"
using surfy::print;


// Global Config
json config;

void pointTest() {
	print("\n\n#### Point Test ####\n\n");
	sg::Shape point = sg::Shape("POINT (2 3)");
	print("Point print: ", point);
	json data = {
		{ "wkt", point.wkt() },
		{ "empty", point.empty },
		{ "x", point.geom.point.x },
		{ "y", point.geom.point.y }
	};
	print(data);
}

void lineTest() {
	print("\n\n#### Line Test ####\n\n");

	/*

	Structure test

	*/

	sg::Shape line = sg::Shape("LINESTRING (0 0, 0 10, 10 10, 10 0, 0 0)");
	print("Line print: ", line);
	json data = {
		{ "wkt", line.wkt() },
		{ "empty", line.empty },
		{ "vertices", line.vertices },
		{ "length", line.length },
		{ "coords",
			{
				{ "closed", line.geom.line.closed },
				{ "empty", line.geom.line.empty }
			}
		}
	};
	print(data);

	/*

	Clip test

	*/

	sg::Shape line4clip = sg::Shape("LINESTRING (0 0, 5 5, 11 10, 15 15)");
	print("\nClip line: ", line4clip);

	sg::Shape mask = sg::Shape("POLYGON ((0 0, 0 6, 6 6, 6 0, 0 0))");
	print("Mask: ", mask);
	
	sg::Shape clippedLine = sg::clip(line4clip, mask);
	print("Clipped Line", clippedLine);
	print("\n");

	/*

	Closed Line Clip

	*/

	sg::Shape line4clip_closed = sg::Shape("LINESTRING (0 0, 0 10, 10 10, 10 0, 0 0)");
	print("Clip Closed Line: ", line4clip_closed);

	sg::Shape clippedClosedLine = sg::clip(line4clip_closed, mask);
	print("Clipped Closed Line", clippedClosedLine);
	print("\n\n");

	/*

	Simplify test

	*/

	sg::Shape complexLine = sg::Shape("LINESTRING (0 0, 2 2, 3 3, 10 2, 6 6, 7 7, 30 30)");
	print("Complex Line", complexLine);

	sg::Shape simpleLine = complexLine.simplify(2);
	print("Simplified Line", simpleLine);
}

void polygonTest() {
	print("\n\n#### Polygon Test ####\n\n");

	// Structure Test
	sg::Shape poly = sg::Shape("POLYGON ((0 0, 0 10, 10 10, 10 0, 0 0),(0 0, 0 5, 5 5, 5 0, 0 0))");
	print("Polygon Print", poly);
	json data = {
		{ "wkt", poly.wkt()} ,
		{ "empty", poly.empty },
		{ "vertices", poly.vertices },
		{ "length", poly.length },
		{ "area", poly.area },
		{ "outer",
			{
				{ "closed", poly.geom.polygon.outer.closed },
				{ "vertices", poly.geom.polygon.outer.vertices },
				{ "length", poly.geom.polygon.outer.length },
				{ "area", poly.geom.polygon.outer.area }
			}
		},
		{ "inner",
			{
				{ "closed", poly.geom.polygon.inner.closed },
				{ "vertices", poly.geom.polygon.inner.vertices },
				{ "length", poly.geom.polygon.inner.length },
				{ "area", poly.geom.polygon.inner.area }
			}
		}
	};
	print(data);

	// Clip Test

	// Simplify Test
}

int main() {

	// pointTest();
	lineTest();
	// polygonTest();
	return 0;
}