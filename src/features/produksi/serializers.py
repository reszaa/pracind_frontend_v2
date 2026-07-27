"""
produksi/serializers.py
========================
"""

from rest_framework import serializers

from entitas.serializers import AkunSerializer

from .models import (
    FormulaProduk,
    HasilPackaging,
    KomposisiFormula,
    ProdukRingkas,
    RekonsiliasiBaris,
    SesiProduksi,
    SetoranBahan,
)


class KomposisiFormulaSerializer(serializers.ModelSerializer):
    class Meta:
        model = KomposisiFormula
        fields = ["id", "nama_bahan", "qty_per_unit", "uom"]


class FormulaProdukSerializer(serializers.ModelSerializer):
    komposisi = KomposisiFormulaSerializer(many=True)

    class Meta:
        model = FormulaProduk
        fields = ["id", "produk", "versi", "aktif", "keterangan", "dibuat_pada", "komposisi"]
        read_only_fields = ["versi", "dibuat_pada"]

    def create(self, validated_data):
        """Buat versi baru: versi = max+1, versi lama otomatis dinonaktifkan.
        Sengaja TIDAK ada update() — formula lama tidak boleh diedit (angka
        rekonsiliasi lama menggantung ke sana)."""
        komposisi_data = validated_data.pop("komposisi")
        if not komposisi_data:
            raise serializers.ValidationError({"komposisi": "Minimal 1 bahan."})
        produk = validated_data["produk"]

        terakhir = produk.formula.order_by("-versi").first()
        versi_baru = (terakhir.versi + 1) if terakhir else 1
        produk.formula.filter(aktif=True).update(aktif=False)

        formula = FormulaProduk.objects.create(versi=versi_baru, **validated_data)
        KomposisiFormula.objects.bulk_create(
            [KomposisiFormula(formula=formula, **k) for k in komposisi_data]
        )
        return formula


class ProdukRingkasSerializer(serializers.ModelSerializer):
    formula_aktif = FormulaProdukSerializer(read_only=True)

    class Meta:
        model = ProdukRingkas
        fields = ["id", "kode", "nama", "kemasan", "uom", "stok_minimum", "aktif", "formula_aktif"]


class SetoranBahanSerializer(serializers.ModelSerializer):
    akun_detail = AkunSerializer(source="akun", read_only=True)

    class Meta:
        model = SetoranBahan
        fields = "__all__"


class HasilPackagingSerializer(serializers.ModelSerializer):
    produk_nama = serializers.CharField(source="produk.nama", read_only=True)

    class Meta:
        model = HasilPackaging
        fields = "__all__"


class RekonsiliasiBarisSerializer(serializers.ModelSerializer):
    akun_detail = AkunSerializer(source="akun", read_only=True)

    class Meta:
        model = RekonsiliasiBaris
        fields = "__all__"


class AlokasiProdukSerializer(serializers.ModelSerializer):
    akun_detail = AkunSerializer(source="akun", read_only=True)
    produk_nama = serializers.CharField(source="produk.nama", read_only=True)

    class Meta:
        from .models import AlokasiProduk
        model = AlokasiProduk
        fields = "__all__"


class SesiProduksiSerializer(serializers.ModelSerializer):
    setoran = SetoranBahanSerializer(many=True, read_only=True)
    alokasi_produk = AlokasiProdukSerializer(many=True, read_only=True)
    hasil_packaging = HasilPackagingSerializer(many=True, read_only=True)
    rekonsiliasi = RekonsiliasiBarisSerializer(many=True, read_only=True)

    class Meta:
        model = SesiProduksi
        fields = "__all__"