from rest_framework import viewsets
from .models import Room
from .serializers import RoomSerializer
from .permissions import IsOwner, IsAdmin
from rest_framework.permissions import IsAuthenticated

class RoomViewSet(viewsets.ModelViewSet):
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Users can only see rooms created by them or if they are admins (conceptually, assuming shared home)
        # For now, let's assume personal rooms per user scope
        return Room.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Only Owner or Admin can modify
            return [IsAuthenticated(), IsAdmin()] # Using IsAdmin as a stand-in for "Manager of the home"
        return super().get_permissions()
