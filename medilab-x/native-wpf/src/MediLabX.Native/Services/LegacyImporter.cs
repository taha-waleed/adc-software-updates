using System.IO;
using System.Text.Json;
using MediLabX.Native.Models;
namespace MediLabX.Native.Services;
public sealed class LegacyImporter(Store store){
 public (int patients,int expenses,int reports,int doctors) Import(string filename){
  using var doc=JsonDocument.Parse(File.ReadAllText(filename));var main=doc.RootElement;var op=main;
  if(main.ValueKind!=JsonValueKind.Object)throw new InvalidDataException("Expected legacy JSON object.");
  if(Prop(main,"ahdc_software_v1") is { } rootMain){main=AsObject(rootMain);if(Prop(doc.RootElement,"mlx_operations_v1") is { } opMain)op=AsObject(opMain);}
  if(Prop(main,"patients") is null && Prop(main,"tests") is null)throw new InvalidDataException("Not a recognized MediLab backup. Export ahdc_software_v1 from the old application first.");
  int pCount=0,eCount=0,rCount=0,dCount=0;
  if(Prop(main,"patients") is { } pp&&pp.ValueKind==JsonValueKind.Array){foreach(var x in pp.EnumerateArray()){
   var receipt=Str(x,"receipt");if(string.IsNullOrWhiteSpace(receipt))continue;
   if(store.All<Patient>("patients").Any(p=>p.Receipt.Equals(receipt,StringComparison.OrdinalIgnoreCase)))continue;
   var p=new Patient{Id=Guid.NewGuid().ToString("N"),Receipt=receipt,Date=Str(x,"date"),Name=Str(x,"name"),Phone=Str(x,"phone"),Age=Str(x,"age"),Gender=Str(x,"gender"),Mr=Str(x,"mr"),ReferringDoctor=Str(x,"doctor",Str(x,"referringDoctor")),PerformingDoctor=Str(x,"performingDoctor"),Notes=Str(x,"notes"),Subtotal=Amount(x,"subtotal",Amount(x,"total")),Discount=Amount(x,"discount"),Received=Amount(x,"received"),CreatedBy="Legacy import"};
   if(Prop(x,"tests") is { } ts&&ts.ValueKind==JsonValueKind.Array)foreach(var t in ts.EnumerateArray()){var name=t.ValueKind==JsonValueKind.String?t.GetString()??"":Str(t,"name");p.Tests.Add(new TestLine{Name=name,Modality=Modality(name),Price=Amount(t,"price")});}
   if(p.Subtotal==0&&p.Tests.Count>0)p.Subtotal=p.Tests.Sum(t=>t.Price);
   store.Put("patients",p.Id,p);pCount++;
  }}
  if(Prop(main,"expenses") is { } ee&&ee.ValueKind==JsonValueKind.Array)foreach(var x in ee.EnumerateArray()){var ex=new Expense{Id=Str(x,"id",Guid.NewGuid().ToString("N")),Date=Str(x,"date"),Description=Str(x,"description"),Amount=Amount(x,"amount"),CreatedBy=Str(x,"createdBy","Legacy import")};if(store.One<Expense>("expenses",ex.Id)is null){store.Put("expenses",ex.Id,ex);eCount++;}}
  if(Prop(main,"reports") is { } rr&&rr.ValueKind==JsonValueKind.Array)foreach(var x in rr.EnumerateArray()){var report=new Report{Id=Str(x,"id",Guid.NewGuid().ToString("N")),Date=Str(x,"date"),PatientId=Str(x,"patientId"),Modality=Str(x,"modality",Str(x,"department","CT")),Findings=Str(x,"findings",Str(x,"body")),Impression=Str(x,"impression")};if(store.One<Report>("reports",report.Id)is null){store.Put("reports",report.Id,report);rCount++;}}
  if(Prop(main,"doctors") is { } dd&&dd.ValueKind==JsonValueKind.Array)foreach(var x in dd.EnumerateArray()){var name=x.ValueKind==JsonValueKind.String?x.GetString()??"":Str(x,"name");if(string.IsNullOrWhiteSpace(name)||store.All<Doctor>("doctors").Any(d=>d.Name.Equals(name,StringComparison.OrdinalIgnoreCase)&&d.Group=="Referring"))continue;var d=new Doctor{Name=name,Group="Referring"};store.Put("doctors",d.Id,d);dCount++;}
  // HR and reagent fields in the supplementary legacy backup are imported without altering source files.
  if(Prop(op,"items") is { } kits&&kits.ValueKind==JsonValueKind.Array)foreach(var x in kits.EnumerateArray()){
   var item=new Reagent{Id=Str(x,"id",Guid.NewGuid().ToString("N")),KitName=Str(x,"kitName"),Company=Str(x,"company"),LotNo=Str(x,"lotNo"),ReceivedFrom=Str(x,"receivedFrom"),ReceivedDate=Str(x,"receivedDate"),Expiry=Str(x,"expiry"),ReceivedQuantity=Amount(x,"initialQty",Amount(x,"qty")),Quantity=Amount(x,"qty"),Finished=Bool(x,"closed")};
   if(store.One<Reagent>("reagents",item.Id)is null)store.Put("reagents",item.Id,item);
  }
  return(pCount,eCount,rCount,dCount);
 }
 public static string Modality(string name){var n=name.ToLowerInvariant();return n.Contains("ct ")||n.StartsWith("ct")?"CT":n.Contains("x-ray")||n.Contains("xray")?"X-Ray":n.Contains("ultrasound")||n.Contains("usg")||n.Contains("doppler")?"Ultrasound":"Other";}
 private static JsonElement AsObject(JsonElement e)=>e.ValueKind==JsonValueKind.String?JsonDocument.Parse(e.GetString()??"{}").RootElement.Clone():e;
 private static JsonElement? Prop(JsonElement e,string name)=>e.ValueKind==JsonValueKind.Object&&e.TryGetProperty(name,out var p)?p:null;
 private static string Str(JsonElement e,string name,string fallback=""){var p=Prop(e,name);if(p is null||p.Value.ValueKind==JsonValueKind.Null)return fallback;return p.Value.ValueKind==JsonValueKind.String?p.Value.GetString()??fallback:p.Value.ToString();}
 private static decimal Amount(JsonElement e,string name,decimal fallback=0){var v=Str(e,name);return decimal.TryParse(v,System.Globalization.NumberStyles.Any,System.Globalization.CultureInfo.InvariantCulture,out var d)?d:fallback;}
 private static bool Bool(JsonElement e,string name){var v=Str(e,name);return v=="true"||v=="True";}
}