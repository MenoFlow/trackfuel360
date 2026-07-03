import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, Fuel, TrendingUp, Car, FuelIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FuelProgress } from "@/components/ui/fuel-progress";
// import { FuelAdjustmentDialog } from "./fuel-adjustment-dialog";
// import { RefuelDialog } from "./refuel-dialog";
import { OcrCompare } from "../common/ocr-compare";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { calculateFuelRemaining, calculateAutonomy, getFuelLevel, getFuelStatus } from "@/lib/fuelCalculations";
import { cn } from "@/lib/utils";
import { MainLayout } from "../Layout/MainLayout";
import { usePleins } from "@/hooks/usePleins";
import { useTrajets } from "@/hooks/useTrajets";
import { useVehicule } from "@/hooks/useVehicules";

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const vehicle = useVehicule(parseInt(id) || null).data;
  const [showOcrDemo, setShowOcrDemo] = React.useState(false);
  const trips = useTrajets(vehicle?.id).data;
  const refuels = usePleins(vehicle?.id).data;

  // Mock OCR data for demonstration
  const mockOcrData = {
    ocrText: "45.8",
    manualValue: "45.5",
    field: "Volume (L)",
    confidence: 87,
    photoUrl: "https://images.unsplash.com/photo-1628618916319-53b6de8aa77a?w=400"
  };

  const fuelRemaining = calculateFuelRemaining(vehicle, trips, refuels);
  const autonomy = calculateAutonomy(vehicle, trips, refuels);
  const fuelLevel = getFuelLevel(vehicle, trips, refuels);
  const fuelStatus = getFuelStatus(vehicle, trips, refuels);
  const totalDistance = trips?.reduce((sum, trip) => sum + Number(trip.distance_km), 0);
  const fuelConsumed = (vehicle?.consommation_nominale / 100) * totalDistance;

  // Data for fuel gauge (pie chart)
  const fuelData = [
    { 
      name: 'Carburant restant', 
      value: fuelRemaining, 
      color: fuelStatus === 'critical' ? 'hsl(var(--destructive1))' : 
             fuelStatus === 'low' ? 'hsl(var(--accent1))' : 
             fuelStatus === 'medium' ? 'hsl(var(--primary1))' : 'hsl(var(--secondary1))'
    },
    { 
      name: 'Vide', 
      value: vehicle?.capacite_reservoir - fuelRemaining, 
      color: 'hsl(var(--muted1))'
    }
  ];

  // Data for trip chart
  const tripData = trips?.map((trip, index) => ({
    date: new Date(trip.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    distance: trip.distance_km,
    consommation: (vehicle?.consommation_nominale / 100) * trip.distance_km
  }));

  const stats = [
    {
      label: "Distance totale",
      value: `${totalDistance?.toLocaleString()} km`,
      icon: MapPin,
      color: "text-primary1"
    },
    {
      label: "Carburant consommé",
      value: `${fuelConsumed.toFixed(1)}L`,
      icon: Fuel,
      color: "text-accent1"
    },
    {
      label: "Autonomie restante",
      value: `${autonomy.toFixed(0)} km`,
      icon: TrendingUp,
      color: autonomy < 50 ? "text-destructive1" : "text-secondary1"
    },
    {
      label: "Consommation moyenne",
      value: `${vehicle?.consommation_nominale}L/100km`,
      icon: Car,
      color: "text-muted-foreground1"
    }
  ];

  // if (!vehicle) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <div className="text-center">
  //         <h1 className="text-2xl font-bold">Véhicule non trouvé</h1>
  //         <Button onClick={() => navigate("/")} className="mt-4">
  //           Retour à la liste
  //         </Button>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <MainLayout>
    
      <div className="min-h-screen from-background to-muted p-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="hover:shadow-glow"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            {/* <FuelAdjustmentDialog vehicle={vehicle} onFuelUpdate={() => {}} /> */}
            {/* <RefuelDialog vehicle={vehicle} onRefuelAdd={() => {}} /> */}
            {/* <FillForm 
              vehicleId={Number(vehicle?.immatriculation)}
              vehicleName={vehicle?.marque}
              onSubmit={handleFillSubmit}
            /> */}
          </div>
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{vehicle?.marque}</h1>
            <p className="text-muted-foreground font-mono"></p>
            <div className="flex items-center gap-2 mt-1">
              {/* {vehicle?.type && (
                <Badge variant="secondary">{vehicle?.type}</Badge>
              )} */}
              <Badge 
                variant={fuelStatus === 'critical' ? 'destructive' : 
                        fuelStatus === 'low' ? 'secondary' : 'default'}
              >
                {fuelStatus === 'critical' ? vehicle?.immatriculation :
                fuelStatus === 'low' ? vehicle?.immatriculation :
                fuelStatus === 'medium' ? 'Moyen' : vehicle?.immatriculation}
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* Main Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className={cn("text-xl font-bold", stat.color)}>{stat.value}</p>
                    </div>
                    <stat.icon className={cn("h-6 w-6", stat.color)} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fuel Gauge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fuel className="h-5 w-5" />
                  Niveau de carburant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <FuelProgress
                    level={fuelLevel}
                    status={fuelStatus}
                    remaining={fuelRemaining}
                    showAlert={false}
                  />
                  
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={fuelData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {fuelData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(1)}L`, '']}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 'var(--radius)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-3xl font-bold">{fuelLevel.toFixed(0)}%</p>
                    <p className="text-sm text-muted-foreground">
                      {fuelRemaining.toFixed(1)}L / {vehicle?.capacite_reservoir}L
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Trip History Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Historique des trajets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tripData}>
                      <XAxis 
                        dataKey="date" 
                        fontSize={12}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        fontSize={12}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 'var(--radius)'
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="distance" 
                        fill="hsl(var(--primary1))" 
                        name="Distance (km)"
                        radius={[2, 2, 0, 0]}
                      />
                      <Bar 
                        dataKey="consommation" 
                        fill="hsl(var(--secondary1))" 
                        name="Consommation (L)"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* OCR Demo Section */}
        {showOcrDemo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <OcrCompare data={mockOcrData} />
          </motion.div>
        )}

        {/* Trip and Refuel Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trip Details */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Détail des trajets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {trips
                    ?.sort((a, b) => new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime())
                    ?.map((trip, index) => (
                    <motion.div
                      key={trip.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <div>
                          <p className="font-medium">
                            {new Date(trip.date_debut).toLocaleDateString('fr-FR', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Trajet #{trip.id}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-semibold">{trip.distance_km} km</p>
                        <p className="text-sm text-muted-foreground">
                          {((vehicle?.consommation_nominale / 100) * trip.distance_km).toFixed(1)}L consommés
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Refuel Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FuelIcon className="h-5 w-5" />
                  Historique des ravitaillements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {refuels?.length > 0 ? (
                    refuels
                      ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      ?.map((refuel, index) => (
                      <motion.div
                        key={refuel.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-accent/20 hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-accent" />
                          <div>
                            <p className="font-medium">
                              {new Date(refuel.date).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Ravitaillement #{refuel.id}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-semibold text-accent">+{refuel.litres}L</p>
                          <p className="text-sm text-muted-foreground">
                            Ajouté au réservoir
                          </p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FuelIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Aucun ravitaillement enregistré</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </ MainLayout>

  );
}
