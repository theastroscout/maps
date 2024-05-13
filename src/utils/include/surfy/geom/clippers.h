/*

Clippers

*/

namespace surfy::geom {

	namespace clippers {

		std::vector<Point> line(const std::vector<Point>& line, const std::vector<Point>& mask) {
		    std::vector<Point> clippedLine;
		    // Iterate through line points
		    int lineSize = line.size();
		    int maskSize = mask.size();

		    for (int i = 0; i < lineSize; ++i) {
		        Point current = line[i];
		        Point next = line[(i + 1) % lineSize];
		        bool insideCurrent = false;
		        bool insideNext = false;

		        // Check if current point is inside mask
		        for (int j = 0; j < maskSize; ++j) {
		            Point p1 = mask[j];
		            Point p2 = mask[(j + 1) % maskSize];
		            if ((p1.y > current.y) != (p2.y > current.y) &&
		                current.x < (p2.x - p1.x) * (current.y - p1.y) / (p2.y - p1.y) + p1.x) {
		                insideCurrent = !insideCurrent;
		            }
		            if ((p1.y > next.y) != (p2.y > next.y) &&
		                next.x < (p2.x - p1.x) * (next.y - p1.y) / (p2.y - p1.y) + p1.x) {
		                insideNext = !insideNext;
		            }
		        }

		        // If current point is inside mask, add it to clipped line
		        if (insideCurrent) {
		            clippedLine.push_back(current);
		        }
		        // If current point and next point are on opposite sides of the mask boundary, clip the line
		        if (insideCurrent != insideNext) {
		            // Calculate intersection point
		            int dx = next.x - current.x;
		            int dy = next.y - current.y;
		            double t = (mask[0].y - current.y) / (double)dy;
		            Point intersection;
		            intersection.x = current.x + dx * t;
		            intersection.y = mask[0].y;
		            // Add intersection point to clipped line
		            clippedLine.push_back(intersection);
		        }
		    }
		    return clippedLine;
		}

	}

	/*

	Clip Polygon

	*/

	Shape clip(const Shape& shape, const Shape& maskSrc) {
		Shape result;

		std::vector<Point> mask = maskSrc.geom.polygon.outer.coords;

		if (shape.type == "Line") {
			result.type = "Line";
			new (&result.geom.line) Line(); // Initialise Geometry::Line
			result.geom.line.coords = clippers::line(shape.geom.line.coords, mask);

		} else if (shape.type == "Polygon") {
			result.type = "Polygon";
			new (&result.geom.polygon) Polygon(); // Initialise Geometry::Polygon

			result.geom.polygon.outer.coords = utils::clip(shape.geom.polygon.outer.coords, mask);

			if(!shape.geom.polygon.inner.coords.empty()){
				result.geom.polygon.inner.coords = utils::clip(shape.geom.polygon.inner.coords, mask);
			}
		}

		result.refresh();
		
		return result;
	}
}