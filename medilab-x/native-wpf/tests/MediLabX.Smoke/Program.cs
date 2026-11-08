using MediLabX.Native.Models;
using MediLabX.Native.Services;
using Microsoft.Data.Sqlite;
using System.Text.Json;

var folder = Path.Combine(Path.GetTempPath(), "MediLabX-SMOKE-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(folder);
int passed=0;
void Check(bool ok,string explanation){if(!ok)throw new InvalidOperationException("FAILED: "+explanation);Console.WriteLine("PASS: "+explanation);passed++;}
try {
 var db=new Store(folder);
 Check(File.Exists(db.FileName),"isolated SQLite database created");
 var id=Guid.NewGuid().ToString("N");
 var record=new Patient{Id=id,Receipt="SMOKE-1001",Date=DateTime.Today.ToString("yyyy-MM-dd"),Name="Synthetic Sample",Subtotal=3500m,Discount=500m,Received=1700m,
     Tests=[new TestLine{Name="CT Brain",Modality="CT",Price=2500m},new TestLine{Name="Chest X-Ray",Modality="X-Ray",Price=1000m}]};
 db.Put("patients",record.Id,record);
 var saved=db.One<Patient>("patients",id);
 Check(saved is not null&&saved.Name=="Synthetic Sample"&&saved.Tests.Count==2,"receipt CRUD and serialized test lines");
 Check(saved!.Net==3000m&&saved.Balance==1300m,"net and outstanding calculations");
 var r1=db.NextReceipt();var r2=db.NextReceipt();
 Check(r1.StartsWith("AH-")&&int.Parse(r2.Split('-')[1])==int.Parse(r1.Split('-')[1])+1,"atomic receipt sequence increments");
 var hashed=Security.Hash("Temporary Test Password 123!");
 Check(Security.Verify("Temporary Test Password 123!",hashed)&&!Security.Verify("incorrect",hashed),"salted PBKDF2 password verification");
 var backup=Path.Combine(folder,"backup.sqlite");db.Backup(backup);
 using(var check=new SqliteConnection($"Data Source={backup};Mode=ReadOnly")){check.Open();using var cmd=check.CreateCommand();cmd.CommandText="SELECT count(*) FROM records WHERE bucket='patients'";Check(Convert.ToInt32(cmd.ExecuteScalar())==1,"consistent SQLite backup includes patient");}
 var invalid=Path.Combine(folder,"unrelated.json");File.WriteAllText(invalid,"{\"notALegacyBackup\":true}");
 bool rejected=false;try{new LegacyImporter(db).Import(invalid);}catch(InvalidDataException){rejected=true;}
 Check(rejected,"unrecognized legacy JSON is rejected");
 var legacy=Path.Combine(folder,"legacy.json");
 var data=new {ahdc_software_v1=new { patients=new []{new {receipt="SMOKE-1002",date=DateTime.Today.ToString("yyyy-MM-dd"),name="Synthetic Legacy Patient",subtotal=2000,discount=200,received=1000,tests=new []{new {name="USG Abdomen",price=2000}}}},
 expenses=new []{new {id="smoke-exp",date=DateTime.Today.ToString("yyyy-MM-dd"),description="Synthetic expense",amount=70}},
 reports=Array.Empty<object>(),doctors=new []{"Synthetic Referral Doctor"}, tests=Array.Empty<object>()}};
 File.WriteAllText(legacy,JsonSerializer.Serialize(data));
 var importer=new LegacyImporter(db);var first=importer.Import(legacy);var again=importer.Import(legacy);
 Check(first.patients==1&&first.expenses==1&&first.doctors==1,"legacy JSON import of patients, expenses and doctors");
 Check(again.patients==0&&again.expenses==0&&again.doctors==0,"re-import does not duplicate existing records");
 Check(db.All<Patient>("patients").Count==2,"old and new records retained together");
 var notices=new NoticeEngine(db);notices.Evaluate();notices.MarkAllRead();Check(notices.List(false).Count==0,"mark read hides notifications without losing their history");
 var settings=db.Settings;settings.CustomOnly=true;settings.CustomBriefLines=["A custom motivational message"];db.Settings=settings;
 Check(new BriefEngine(db).Next()=="A custom motivational message","custom Now Brief line persisted");
 Console.WriteLine($"SUCCESS: {passed} smoke checks passed.");
} finally {try{Directory.Delete(folder,true);}catch{}}