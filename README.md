RocketSim : CFD Based Rocket Flight Simulator

RocketSim is an interactive web based rocket flight simulator that models rocket motion using principles from Computational Fluid Dynamics (CFD) , aerodynamics , and classical flight mechanics.

It allows users to experiment with thrust, drag, mass, and atmospheric effects to visualize real time rocket trajectories.

Live Preview
[https://blaze505050.github.io/Rocket-Sim/](https://blaze505050.github.io/Rocket-Sim/)

Core Concepts Used

Aerodynamics
* Drag force modeling
* Air density variation
* Velocity dependent resistance
* Stability effects

Computational Fluid Dynamics (CFD)

The simulator approximates airflow interaction around the rocket body to compute drag and flow resistance.

Numerical Methods
Rocket motion is solved using:
**FVD : Finite Volume Discretization
This method divides the simulation domain into small control volumes and applies conservation laws.
Used for:
* Momentum conservation
* Force balance
* Velocity updates

Physics Model
The rocket motion is governed by:
Thrust Force
Drag Force
Net Force

Position Update (FVD Time Marching)

Finite Volume time stepping:

[v_{t+1} = v_t + a \Delta t]
[x_{t+1} = x_t + v \Delta t]

Simulation Methodology

| Component        | Method Used                        |
| ---------------- | ---------------------------------- |
| Flow modeling    | CFD approximation                  |
| Discretization   | Finite Volume Discretization (FVD) |
| Time integration | Explicit time stepping             |
| Drag modeling    | Quadratic aerodynamic drag         |
| Gravity          | Constant gravitational field       |
| Mass variation   | Optional / configurable            |

Features

Real time rocket launch simulation
Physics based trajectory calculation
CFD drag approximation
Adjustable thrust parameters
Atmospheric resistance modeling
Smooth animation rendering
Browser based

Interface & Controls

Launch Controls
Start / Launch
Initiates the rocket simulation using current parameters.
Reset
Resets:
* Velocity
* Altitude
* Time
* Forces
Returns rocket to launch pad.

Parameter Inputs
Thrust
Controls engine output force.
Higher thrust:
* Faster ascent
* Higher altitude
* Greater drag interaction

Mass
Rocket structural + fuel mass.
Higher mass:
* Slower acceleration
* Higher inertia
* More thrust required

Drag Coefficient (Cd)

Represents aerodynamic efficiency.

| Shape              | Cd        |
| ------------------ | --------- |
| Streamlined rocket | 0.2 – 0.4 |
| Cylindrical body   | 0.5 – 0.8 |

Higher Cd → More air resistance.

Air Density (ρ)
Atmospheric thickness parameter.
Affects drag force directly.
Can simulate:
* Sea level
* High altitude
* Thin atmospheres
  
Time Step (Δt)
Controls simulation resolution.
Smaller Δt:
* Higher accuracy
* More computation

Outputs & Visualization
The simulator visualizes:
* Rocket altitude
* Velocity profile
* Acceleration
* Thrust vs drag balance
* Flight trajectory
All computed in real time.

CFD & FVD Implementation Detail
Unlike simple kinematic simulators, RocketSim applies:
Control Volume Approach
Each time step treats the rocket as a moving finite volume where:
* Forces are integrated
* Momentum is conserved
* Fluxes are balanced
This allows stable numerical evolution of:
* Velocity field
* Acceleration
* Position

Future Enhancements

Planned upgrades:
* 2D trajectory simulation
* Wind shear modeling
* Multi-stage rockets
* Fuel burn mass reduction
* Mach effects
* Shockwave modeling
* Re-entry heating
* Orbital mechanics mode

Pull requests are welcome.

You can contribute by:

* Improving physics accuracy
* Adding UI controls
* Enhancing CFD modeling
* Optimizing performance


Just say 👍
