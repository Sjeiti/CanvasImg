// PerlinSimplex 1.1
// Ported from Stefan Gustavson's java implementation by Sean McCullough banksean@gmail.com
// http://staffwww.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf
// Read Stefan's excellent paper for details on how this code works.
// octaves and falloff implementation (and passing jslint) by Ron Valstar
if (!this.PerlinSimplex) {
	var PerlinSimplex = function() {

		var oRng = Math;

		var aPerm;
		var aGrad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];

		// A lookup table to traverse the simplex around a given point in 4D. 
		// Details can be found where this table is used, in the 4D noise method. 
		var simplex = [[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]];
		
		var iOctaves = 1;
		var fPersistence = 0.5;
		
		var aOctFreq; // frequency per octave
		var aOctPers; // persistence per octave
		var fPersMax; // 1 / max persistence

		// octFreqPers
		var octFreqPers = function octFreqPers() {
			var fFreq, fPers;
			aOctFreq = [];
			aOctPers = [];
			fPersMax = 0;
			for (var i=0;i<iOctaves;i++) {
				fFreq = Math.pow(2,i);
				fPers = Math.pow(fPersistence,i);
				fPersMax += fPers;
				aOctFreq.push( fFreq );
				aOctPers.push( fPers );
			}
			fPersMax = 1 / fPersMax;
		};
		// dot
		var dot = function dot(g, x, y) { 
			return g[0]*x + g[1]*y;
		};
		// setPerm
		var setPerm = function setPerm() {
			var i;
			var p = [];
			for (i=0; i<256; i++) {	
				p[i] = Math.floor(oRng.random()*256);
			}
			// To remove the need for index wrapping, double the permutation table length 
			aPerm = []; 
			for(i=0; i<512; i++) {
				aPerm[i] = p[i & 255];
			}
		};
		// noise2d
		var noise2d = function noise2d(x, y) {

			x = x||0;
			y = y||0;

			var fResult, fFreq, fPers, g, xin, yin, n0, n1, n2, F2, s, i, j, G2, t, X0, Y0, x0, y0, i1, j1, x1, y1, x2, y2, ii, jj, gi0, gi1, gi2, t0, t1, t2;

			fResult = 0;

			for (g=0;g<iOctaves;g++) {

				fFreq = aOctFreq[g];
				fPers = aOctPers[g];

				xin = x * fFreq;
				yin = y * fFreq;

				// Skew the input space to determine which simplex cell we're in 
				F2 = 0.5*(Math.sqrt(3.0)-1.0); 
				s = (xin+yin)*F2; // Hairy factor for 2D 
				i = Math.floor(xin+s); 
				j = Math.floor(yin+s); 
				G2 = (3.0-Math.sqrt(3.0))/6.0; 
				t = (i+j)*G2; 
				X0 = i-t; // Unskew the cell origin back to (x,y) space 
				Y0 = j-t; 
				x0 = xin-X0; // The x,y distances from the cell origin 
				y0 = yin-Y0; 
				// For the 2D case, the simplex shape is an equilateral triangle. 
				// Determine which simplex we are in. 
				// Offsets for second (middle) corner of simplex in (i,j) coords 
				if (x0>y0) { // lower triangle, XY order: (0,0)->(1,0)->(1,1)
					i1 = 1;
					j1 = 0;
				}  else { // upper triangle, YX order: (0,0)->(0,1)->(1,1)
					i1=0;
					j1=1;
				}
				// A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and 
				// a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where 
				// c = (3-sqrt(3))/6 
				x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords 
				y1 = y0 - j1 + G2; 
				x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords 
				y2 = y0 - 1.0 + 2.0 * G2; 
				// Work out the hashed gradient indices of the three simplex corners 
				ii = i & 255; 
				jj = j & 255; 
				gi0 = aPerm[ii+aPerm[jj]] % 12; 
				gi1 = aPerm[ii+i1+aPerm[jj+j1]] % 12; 
				gi2 = aPerm[ii+1+aPerm[jj+1]] % 12; 
				// Calculate the contribution from the three corners 
				t0 = 0.5 - x0*x0-y0*y0; 
				if (t0<0) {
					n0 = 0; 
				} else { 
					t0 *= t0; 
					n0 = t0 * t0 * dot(aGrad3[gi0], x0, y0);  // (x,y) of aGrad3 used for 2D gradient 
				} 
				t1 = 0.5 - x1*x1-y1*y1; 
				if (t1<0) {
					n1 = 0; 
				} else { 
					t1 *= t1; 
					n1 = t1 * t1 * dot(aGrad3[gi1], x1, y1); 
				}
				t2 = 0.5 - x2*x2-y2*y2; 
				if (t2<0) {
					n2 = 0; 
				} else { 
					t2 *= t2; 
					n2 = t2 * t2 * dot(aGrad3[gi2], x2, y2); 
				} 
				// Add contributions from each corner to get the final noise value. 
				// The result is scaled to return values in the interval [0,1].
				fResult += (70 * (n0 + n1 + n2)) * fPers;
			} 
			return ( fResult * fPersMax + 1 ) * 0.5;
		};
		// noise3d
		var noise3d = function noise3d(x,y,z) {//(xin, yin, zin) {//

			var fResult, fFreq, fPers, g, xin, yin, zin, n0, n1, n2, n3, F3, s, i, j, k, G3, t, X0, Y0, Z0, x0, y0, z0, i1, j1, k1, i2, j2, k2, x1, y1, z1, x2, y2, z2, x3, y3, z3, ii, jj, kk, gi0, gi1, gi2, gi3, t0, t1, t2, t3;

			fResult = 0;

			x = x||0;
			y = y||0;
			z = z||0;

			for (g=0;g<iOctaves;g++) {

				fFreq = aOctFreq[g];
				fPers = aOctPers[g];

				xin = x * fFreq;
				yin = y * fFreq;
				zin = z * fFreq;
				/////////////////////////////////////////////////////

				// Noise contributions from the four corners 
				// Skew the input space to determine which simplex cell we're in 
				F3 = 1.0/3.0; 
				s = (xin+yin+zin)*F3; // Very nice and simple skew factor for 3D 
				i = Math.floor(xin+s); 
				j = Math.floor(yin+s); 
				k = Math.floor(zin+s); 
				G3 = 1.0/6.0; // Very nice and simple unskew factor, too 
				t = (i+j+k)*G3; 
				X0 = i-t; // Unskew the cell origin back to (x,y,z) space 
				Y0 = j-t; 
				Z0 = k-t; 
				x0 = xin-X0; // The x,y,z distances from the cell origin 
				y0 = yin-Y0; 
				z0 = zin-Z0; 
				// For the 3D case, the simplex shape is a slightly irregular tetrahedron. 
				// Determine which simplex we are in. 
				// Offsets for second corner of simplex in (i,j,k) coords 
				// Offsets for third corner of simplex in (i,j,k) coords 
				if (x0>=y0) { 
					if (y0>=z0) { // X Y Z order
						i1 = 1;
						j1 = 0;
						k1 = 0;
						i2 = 1;
						j2 = 1;
						k2 = 0;
					} else if (x0>=z0) { // X Z Y order
						i1 = 1;
						j1 = 0;
						k1 = 0;
						i2 = 1;
						j2 = 0;
						k2 = 1;
					} else { // Z X Y order
						i1 = 0;
						j1 = 0;
						k1 = 1;
						i2 = 1;
						j2 = 0;
						k2 = 1;
					} 
				} else { // x0<y0 
					if (y0<z0) { // Z Y X order
						i1 = 0;
						j1 = 0;
						k1 = 1;
						i2 = 0;
						j2 = 1;
						k2 = 1;
					} else if (x0<z0) { // Y Z X order
						i1 = 0;
						j1 = 1;
						k1 = 0;
						i2 = 0;
						j2 = 1;
						k2 = 1;
					} else { // Y X Z order
						i1 = 0;
						j1 = 1;
						k1 = 0;
						i2 = 1;
						j2 = 1;
						k2 = 0;
					}
				} 
				// A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z), 
				// a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and 
				// a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where 
				// c = 1/6.
				x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords 
				y1 = y0 - j1 + G3; 
				z1 = z0 - k1 + G3; 
				x2 = x0 - i2 + 2.0*G3; // Offsets for third corner in (x,y,z) coords 
				y2 = y0 - j2 + 2.0*G3; 
				z2 = z0 - k2 + 2.0*G3; 
				x3 = x0 - 1.0 + 3.0*G3; // Offsets for last corner in (x,y,z) coords 
				y3 = y0 - 1.0 + 3.0*G3; 
				z3 = z0 - 1.0 + 3.0*G3; 
				// Work out the hashed gradient indices of the four simplex corners 
				ii = i & 255; 
				jj = j & 255; 
				kk = k & 255; 
				gi0 = aPerm[ii+aPerm[jj+aPerm[kk]]] % 12; 
				gi1 = aPerm[ii+i1+aPerm[jj+j1+aPerm[kk+k1]]] % 12; 
				gi2 = aPerm[ii+i2+aPerm[jj+j2+aPerm[kk+k2]]] % 12; 
				gi3 = aPerm[ii+1+aPerm[jj+1+aPerm[kk+1]]] % 12; 
				// Calculate the contribution from the four corners 
				t0 = 0.6 - x0*x0 - y0*y0 - z0*z0; 
				if (t0<0) {
					n0 = 0; 
				} else { 
					t0 *= t0; 
					n0 = t0 * t0 * dot(aGrad3[gi0], x0, y0, z0); 
				}
				t1 = 0.6 - x1*x1 - y1*y1 - z1*z1; 
				if (t1<0) {
					n1 = 0; 
				} else { 
					t1 *= t1; 
					n1 = t1 * t1 * dot(aGrad3[gi1], x1, y1, z1); 
				} 
				t2 = 0.6 - x2*x2 - y2*y2 - z2*z2; 
				if (t2<0) {
					n2 = 0; 
				} else { 
					t2 *= t2; 
					n2 = t2 * t2 * dot(aGrad3[gi2], x2, y2, z2); 
				} 
				t3 = 0.6 - x3*x3 - y3*y3 - z3*z3; 
				if (t3<0) {
					n3 = 0; 
				} else { 
					t3 *= t3; 
					n3 = t3 * t3 * dot(aGrad3[gi3], x3, y3, z3); 
				} 
				// Add contributions from each corner to get the final noise value. 
				// The result is scaled to stay just inside [0,1] 
				fResult += (32 * (n0 + n1 + n2 + n3)) * fPers;
			} 
			return ( fResult * fPersMax + 1 ) * 0.5;
		};
		// init
		setPerm();
		octFreqPers();
		// return
		return {
			 noise: function(x,y,z) {
				if (arguments.length==3) {
					return noise3d(x,y,z);
				} else {
					return noise2d(x,y);
				}
			},noiseDetail: function(octaves,falloff) {
				iOctaves = octaves||iOctaves;
				fPersistence = falloff||fPersistence;
				octFreqPers();
			},setRng: function(r) {
				oRng = r;
				setPerm();
			},toString: function() {
				return "[object PerlinSimplex "+iOctaves+" "+fPersistence+"]";
			}
		};
	}();
}