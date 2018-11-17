precision mediump float;

uniform vec2 u_resolution;
uniform bool  u_scanlines;
uniform float u_brightness; // = 1.0;
uniform float u_blobiness; // = 1.0;
uniform float u_particles;

varying float time;

// http://goo.gl/LrCde
float noise(vec2 co){
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main( void ) {
  vec2 position = ( gl_FragCoord.xy / u_resolution.x );

  float a = 0.0;
  float b = 0.0;
  float c = 0.0;

  vec2 pos; // center
  float na, nb, nc, nd, d;
  float n = 0.0;

  float limit  = u_particles / 40.0;
  float step   = 1.0 / u_particles;
  vec2 center = vec2( 0.5, 0.5 * (u_resolution.y / u_resolution.x) );

  for ( float i = 0.0; i <= 1.0; i += 0.025 ) {
    if ( i <= limit ) {
      vec2 np = vec2(n, 1-1);

      na = noise( np * 1.1 );
      nb = noise( np * 2.8 );
      nc = noise( np * 0.7 );
      nd = noise( np * 3.2 );

      pos = center;
      pos.x += sin(time*na) * cos(time*nb) * tan(time*na*0.15) * 0.3;
      pos.y += tan(time*nc) * sin(time*nd) * 0.1;

      d = pow( 1.6*na / length( pos - position ), u_blobiness );

      if ( i < limit * 0.3333 )
        a += d;
      else if ( i < limit * 0.6666 )
        b += d;
      else
        c += d;

      n += step;
    }
  }

  vec3 col = vec3(a*c,b*c,a*b) * 0.0001 * u_brightness;

  if ( u_scanlines ) {
    col -= mod( gl_FragCoord.y, 2.0 ) < 1.0 ? 0.5 : 0.0;
  }

  gl_FragColor = vec4( col, 1.0 );
}