"""
inventory/serializers.py
=========================
"""

from rest_framework import serializers

from entitas.serializers import AkunSerializer

from .models import Alat, BatchBarangJadi, IsiTanki, MutasiBarangJadi, Tanki


class BatchBarangJadiSerializer(serializers.ModelSerializer):
    pemilik_detail = AkunSerializer(source="pemilik", read_only=True)
    produk_nama = serializers.CharField(source="produk.nama", read_only=True)
    produk_uom = serializers.CharField(source="produk.uom", read_only=True)

    class Meta:
        model = BatchBarangJadi
        fields = "__all__"


class MutasiBarangJadiSerializer(serializers.ModelSerializer):
    jenis_display = serializers.CharField(source="get_jenis_display", read_only=True)
    produk_nama = serializers.CharField(source="produk.nama", read_only=True)

    class Meta:
        model = MutasiBarangJadi
        fields = "__all__"


class AlatSerializer(serializers.ModelSerializer):
    kondisi_display = serializers.CharField(source="get_kondisi_display", read_only=True)

    class Meta:
        model = Alat
        fields = "__all__"
        read_only_fields = ["dibuat_pada", "diperbarui_pada"]


class IsiTankiSerializer(serializers.ModelSerializer):
    tanki_kode = serializers.CharField(source="tanki.kode", read_only=True)
    sesi_asal_nomor = serializers.CharField(source="sesi_asal.nomor", read_only=True, default=None)

    class Meta:
        model = IsiTanki
        fields = "__all__"


class TankiSerializer(serializers.ModelSerializer):
    isi = IsiTankiSerializer(many=True, read_only=True)
    jenis_display = serializers.CharField(source="get_jenis_display", read_only=True)

    class Meta:
        model = Tanki
        fields = "__all__"
        read_only_fields = []