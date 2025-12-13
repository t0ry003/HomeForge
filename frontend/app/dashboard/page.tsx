"use client"

import { useState } from "react"
import { 
  Activity, 
  Thermometer, 
  Droplets, 
  Zap, 
  Lightbulb, 
  Wifi, 
  Lock, 
  Music,
  Fan,
  Tv
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  const [lights, setLights] = useState(true)
  const [brightness, setBrightness] = useState([75])
  const [temperature, setTemperature] = useState([21])
  const [security, setSecurity] = useState(true)

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your smart home control center.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            <Wifi className="mr-1 h-3 w-3" /> Connected
          </Badge>
          <Badge variant="secondary" className="px-3 py-1">
            System Healthy
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Energy
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42.5 kWh</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Temperature
            </CardTitle>
            <Thermometer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">21.5°C</div>
            <p className="text-xs text-muted-foreground">
              Optimal range
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Humidity
            </CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45%</div>
            <p className="text-xs text-muted-foreground">
              Comfortable
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Devices
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              3 in standby
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Living Room Control</CardTitle>
            <CardDescription>
              Manage devices in the main living area.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Lightbulb className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium leading-none">Main Lights</p>
                  <p className="text-sm text-muted-foreground">Philips Hue Bridge</p>
                </div>
              </div>
              <Switch checked={lights} onCheckedChange={setLights} />
            </div>
            
            {lights && (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Brightness</span>
                  <span className="text-sm font-medium">{brightness}%</span>
                </div>
                <Slider 
                  defaultValue={[75]} 
                  max={100} 
                  step={1} 
                  value={brightness}
                  onValueChange={setBrightness}
                />
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-orange-500/10 rounded-full">
                  <Thermometer className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium leading-none">Thermostat</p>
                  <p className="text-sm text-muted-foreground">Nest Learning</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{temperature}°C</span>
              </div>
            </div>
            <div className="pt-2">
               <Slider 
                  defaultValue={[21]} 
                  min={16}
                  max={30} 
                  step={0.5} 
                  value={temperature}
                  onValueChange={setTemperature}
                />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Frequently used scenes and devices.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between space-x-4 border p-4 rounded-lg">
              <div className="flex items-center space-x-4">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Security System
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {security ? "Armed" : "Disarmed"}
                  </p>
                </div>
              </div>
              <Switch checked={security} onCheckedChange={setSecurity} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-24 flex flex-col gap-2">
                <Tv className="h-6 w-6" />
                <span>Movie Mode</span>
              </Button>
              <Button variant="outline" className="h-24 flex flex-col gap-2">
                <Music className="h-6 w-6" />
                <span>Party Mode</span>
              </Button>
              <Button variant="outline" className="h-24 flex flex-col gap-2">
                <Fan className="h-6 w-6" />
                <span>Air Purifier</span>
              </Button>
              <Button variant="outline" className="h-24 flex flex-col gap-2">
                <Lightbulb className="h-6 w-6" />
                <span>All Off</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
