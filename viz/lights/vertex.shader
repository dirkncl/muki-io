precision mediump float;

uniform float u_millis;
uniform float u_energy;
attribute vec2 a_position;
varying float time;

void main() {
  gl_Position = vec4 (a_position, 0, 1);

  time   = u_millis * u_energy;
}