#include <iostream>
#include <vector>
using namespace std;

struct Point {
    float x, y;
};

vector<Point> sutherlandHodgman(const vector<Point>& poly, const vector<Point>& mask) {
    vector<Point> output = poly;

    for (int i = 0; i < mask.size(); ++i) {
        vector<Point> input = output;
        output.clear();
        
        const Point& a = mask[i];
        const Point& b = mask[(i + 1) % mask.size()];

        for (int j = 0; j < input.size(); ++j) {
            const Point& p1 = input[j];
            const Point& p2 = input[(j + 1) % input.size()];

            float p1Side = (a.x - b.x) * (p1.y - a.y) - (a.y - b.y) * (p1.x - a.x);
            float p2Side = (a.x - b.x) * (p2.y - a.y) - (a.y - b.y) * (p2.x - a.x);

            if (p1Side >= 0)
                output.push_back(p1);
            if (p1Side * p2Side < 0) {
                Point intersect;
                intersect.x = (p1.x * p2Side - p2.x * p1Side) / (p2Side - p1Side);
                intersect.y = (p1.y * p2Side - p2.y * p1Side) / (p2Side - p1Side);
                output.push_back(intersect);
            }
        }
    }

    return output;
}

float calculatePolygonArea(const vector<Point>& polygon) {
    int n = polygon.size();
    float area = 0;
    for (int i = 0; i < n; ++i) {
        int j = (i + 1) % n;
        area += polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
    }
    return abs(area) / 2.0f;
}

int main() {
    /*
    vector<Point> poly = {{0, 0}, {0, 4}, {4, 4}, {4, 0}};
    vector<Point> mask = {{1, 1}, {1, 3}, {3, 3}, {3, 1}};
    */

    // vector<Point> poly = {{0, 0}, {0, 4}, {4, 4}, {4, 0}, {0, 0}};
    // vector<Point> mask = {{1, 1}, {1, 3}, {5, 5}, {3, 1}, {1, 1}};

    
    vector<Point> unsortedPoly = {{0, 0}, {4, 0}, {4, 4}, {0, 4}, {0,0}};
    vector<Point> poly = {{0, 0}, {0, 4}, {4, 4}, {4, 0}};
    vector<Point> mask = {{1, 1}, {1, 3}, {3, 3}, {3, 1}};
    vector<Point> unsortedMask = {{1, 1}, {3, 1}, {3, 3}, {1, 3}};
    vector<Point> unsortedMask2 = {{1, 1}, {1, 5}, {3, 5}, {3, 1}, {1,1}};
    

    vector<Point> clipped = sutherlandHodgman(unsortedPoly, unsortedMask2);

    cout << "Clipped polygon:" << endl;
    for (const Point& p : clipped) {
        cout << "(" << p.x << ", " << p.y << ")" << endl;
    }

    vector<Point> polygon = {{0, 0}, {4, 0}, {4, 3}, {1, 3}};
    float area = calculatePolygonArea(polygon);
    cout << "Area of the polygon: " << area << endl;

    return 0;
}
