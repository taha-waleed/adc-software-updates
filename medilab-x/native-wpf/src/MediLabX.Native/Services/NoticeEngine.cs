using MediLabX.Native.Models;
namespace MediLabX.Native.Services;
public sealed class NoticeEngine(Store store){
 private string? lastKey;
 public void Evaluate(){var p=store.All<Patient>("patients").Where(x=>!x.Deleted).ToList();var exp=store.All<Expense>("expenses");var today=DateTime.Today.ToString("yyyy-MM-dd");decimal sales=p.Where(x=>x.Date==today).Sum(x=>x.Received),spend=exp.Where(x=>x.Date==today).Sum(x=>x.Amount);
  if(sales>0&&spend>sales*.7m)AddOnce("expense:"+today,"Expense alert",$"Today's expenses are {Math.Round(spend/sales*100)}% of collections.","warning");
  if(sales>0){var previous=DateTime.Today.AddDays(-1).ToString("yyyy-MM-dd");var yesterday=p.Where(x=>x.Date==previous).Sum(x=>x.Received);if(yesterday>0&&sales>yesterday*1.2m)AddOnce("growth:"+today,"Congratulations",$"Collections have increased compared with yesterday.","success");}
  var expiring=store.All<Reagent>("reagents").Count(r=>!r.Finished&&DateTime.TryParse(r.Expiry,out var date)&&date<=DateTime.Today.AddDays(30));if(expiring>0)AddOnce("stock:"+today,"Reagent expiry",$"{expiring} stock batch(es) require an expiry check.","warning");
 }
 private void AddOnce(string key,string title,string message,string kind){if(store.One<Notice>("notice-keys",key)is not null)return;var n=new Notice{Title=title,Message=message,Kind=kind};store.Put("notices",n.Id,n);store.Put("notice-keys",key,n);lastKey=key;}
 public IReadOnlyList<Notice> List(bool history)=>store.All<Notice>("notices").Where(x=>history||!x.IsRead).OrderByDescending(x=>x.At).ToList();
 public void MarkAllRead(){foreach(var x in store.All<Notice>("notices")){if(!x.IsRead){x.IsRead=true;store.Put("notices",x.Id,x);}}}
}