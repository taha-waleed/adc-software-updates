using MediLabX.Native.Models;
namespace MediLabX.Native.Services;
public sealed class BriefEngine(Store store){
 private int index;
 public string Next(){var s=store.Settings;var p=store.All<Patient>("patients").Where(x=>!x.Deleted).ToList();var exp=store.All<Expense>("expenses");var stock=store.All<Reagent>("reagents");var leaves=store.All<LeaveRecord>("leaves");var today=DateTime.Today.ToString("yyyy-MM-dd");
  var messages=new List<string>{ $"{p.Count} patient visits are registered in MediLab X.", $"Today's collections: Rs {p.Where(x=>x.Date==today).Sum(x=>x.Received):N0}.", $"Outstanding patient balance: Rs {p.Sum(x=>x.Balance):N0}.", $"Today's recorded expenses: Rs {exp.Where(x=>x.Date==today).Sum(x=>x.Amount):N0}."};
  var due=stock.Count(x=>!x.Finished&&DateTime.TryParse(x.Expiry,out var date)&&date.Date<=DateTime.Today.AddDays(30));if(due>0)messages.Insert(0,$"{due} reagent batch(es) need expiry review within 30 days.");
  var pending=leaves.Count(x=>x.Status.Equals("Pending",StringComparison.OrdinalIgnoreCase));if(pending>0)messages.Insert(0,$"{pending} leave request(s) are pending in Admin.");
  messages.AddRange(s.CustomBriefLines.Where(x=>!string.IsNullOrWhiteSpace(x)));
  if(s.CustomOnly&&s.CustomBriefLines.Any())messages=s.CustomBriefLines.Where(x=>!string.IsNullOrWhiteSpace(x)).ToList();
  var result=messages[index%messages.Count];index++;return result;
 }
}