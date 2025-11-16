from django.db import models
from django.contrib.auth.models import User # Modelul de User încorporat

# 1. Locatie (Casa, Biroul)
class Locatie(models.Model):
    nume = models.CharField(max_length=100)
    # Relație Mulți-la-Mulți cu Userii.
    # O locație are mai mulți membri, un user poate fi în mai multe locații.
    # related_name ne lasă să accesăm locațiile unui user (user.locatii)
    membri = models.ManyToManyField(User, related_name='locatii')

    def __str__(self):
        return self.nume

# 2. Camera (Living, Bucătărie)
class Camera(models.Model):
    # Relație Unu-la-Mulți (o cameră aparține unei singure locații)
    locatie = models.ForeignKey(Locatie, on_delete=models.CASCADE, related_name='camere')
    nume = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.locatie.nume} - {self.nume}"

# 3. Tipul Dispozitivului (Configurare)
class TipDispozitiv(models.Model):
    nume_tip = models.CharField(max_length=50, unique=True) # ex: "LIGHT", "THERMOSTAT"
    descriere = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nume_tip

# 4. Dispozitivul (Lustra, Termostatul)
class Dispozitiv(models.Model):
    nume = models.CharField(max_length=100)
    vendor_id = models.CharField(max_length=100, unique=True) # ID-ul real (MAC, etc.)
    camera = models.ForeignKey(Camera, on_delete=models.SET_NULL, null=True, related_name='dispozitive')
    tip_dispozitiv = models.ForeignKey(TipDispozitiv, on_delete=models.PROTECT)

    def __str__(self):
        return self.nume

# 5. Starea Dispozitivului (aici e JSONB-ul)
class StareDispozitiv(models.Model):
    # Relație Unu-la-Unu. Un dispozitiv are o singură stare curentă.
    dispozitiv = models.OneToOneField(Dispozitiv, on_delete=models.CASCADE, primary_key=True, related_name='stare')
    # Acesta este echivalentul lui JSONB din PostgreSQL
    stare = models.JSONField(default=dict) 
    ultima_actualizare = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Stare pentru {self.dispozitiv.nume}"